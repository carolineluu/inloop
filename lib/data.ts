import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  PatientSummary,
  PatientChart,
  Setting,
  Observation,
  ConditionItem,
  MedicationItem,
  DiagnosticReportItem,
} from "./types";

// Canonical dataset: one Abridge "synthetic ambient FHIR" encounter per line.
const DATA_PATH = path.join(
  process.cwd(),
  "data-src",
  "synthetic-ambient-fhir-25.jsonl",
);

// ---- raw record shape (loosely typed; we only read what we use) ----

interface Coding {
  code?: string;
  display?: string;
  system?: string;
}
interface CodeableConcept {
  text?: string;
  coding?: Coding[];
}
interface RawResource {
  code?: CodeableConcept;
  clinicalStatus?: CodeableConcept;
  onsetDateTime?: string;
  effectiveDateTime?: string;
  status?: string;
  category?: { coding?: Coding[] }[];
  valueQuantity?: { value?: number; unit?: string };
  valueString?: string;
  valueCodeableConcept?: CodeableConcept;
  component?: {
    code?: CodeableConcept;
    valueQuantity?: { value?: number; unit?: string };
  }[];
  medicationCodeableConcept?: CodeableConcept;
  medicationReference?: { display?: string };
}
interface RawRecord {
  id: string;
  metadata: {
    patient_id: string;
    encounter_id: string;
    date: string;
    status: string;
    visit_type: string;
    visit_title: string;
    related_resource_counts?: Record<string, number>;
  };
  patient_context: {
    patient: {
      gender?: string;
      birthDate?: string;
      name?: {
        use?: string;
        family?: string;
        given?: string[];
        prefix?: string[];
      }[];
      maritalStatus?: CodeableConcept;
    };
    longitudinal_summary?: {
      resource_counts?: Record<string, number>;
      condition_labels?: string[];
      medication_labels?: string[];
    };
  };
  encounter_fhir: {
    encounter?: {
      status?: string;
      class?: { code?: string };
      period?: { start?: string; end?: string };
      reasonCode?: CodeableConcept[];
    };
    related_resources?: Record<string, RawResource[]>;
  };
  transcript: string;
  note: string;
  after_visit_summary: string;
}

// ---- helpers ----

const text = (c?: CodeableConcept): string =>
  c?.text || c?.coding?.[0]?.display || c?.coding?.[0]?.code || "";

/** Strip trailing SNOMED-style qualifiers for readability. */
const cleanLabel = (s: string): string =>
  s
    .replace(
      /\s*\((disorder|finding|situation|procedure|regime\/therapy|qualifier value)\)\s*$/i,
      "",
    )
    .trim();

function ageAt(birthDate?: string, at?: string): number {
  if (!birthDate) return 0;
  const b = new Date(birthDate);
  const ref = at ? new Date(at) : new Date();
  let age = ref.getFullYear() - b.getFullYear();
  const m = ref.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < b.getDate())) age--;
  return age;
}

function deriveSetting(classCode?: string, visitType = "", title = ""): Setting {
  const t = `${visitType} ${title}`.toLowerCase();
  if (t.includes("hospice")) return "Hospice";
  if (t.includes("skilled nursing") || /\bsnf\b/.test(t)) return "SNF";
  if (
    classCode === "IMP" ||
    t.includes("hospital admission") ||
    t.includes("inpatient")
  ) {
    return "Inpatient";
  }
  return "Outpatient";
}

function personName(rec: RawRecord): string {
  const names = rec.patient_context.patient.name || [];
  const n = names.find((x) => x.use === "official") || names[0];
  if (!n) return "Unknown patient";
  const given = (n.given || []).join(" ");
  return [given, n.family].filter(Boolean).join(" ") || "Unknown patient";
}

function mrnFor(patientId: string): string {
  return "MRN-" + patientId.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function losDays(setting: Setting, start?: string, end?: string): number | null {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

function obsValue(r: RawResource): string {
  if (r.valueQuantity?.value != null) {
    return `${round(r.valueQuantity.value)}${
      r.valueQuantity.unit ? " " + r.valueQuantity.unit : ""
    }`;
  }
  if (r.valueString) return r.valueString;
  if (r.valueCodeableConcept) return text(r.valueCodeableConcept);
  if (r.component?.length) {
    // e.g. blood pressure -> "120/80 mmHg"
    const parts = r.component
      .map((c) => (c.valueQuantity?.value != null ? round(c.valueQuantity.value) : null))
      .filter((v): v is number => v != null);
    const unit = r.component.find((c) => c.valueQuantity?.unit)?.valueQuantity?.unit;
    if (parts.length) return `${parts.join("/")}${unit ? " " + unit : ""}`;
  }
  return "";
}

const round = (n: number): number => Math.round(n * 100) / 100;

/** Dedupe observations by name, keeping the most recent, capped. */
function pickObservations(
  resources: RawResource[],
  wantCategory: string,
  limit: number,
): Observation[] {
  const latest = new Map<string, Observation>();
  for (const r of resources) {
    const category = r.category?.[0]?.coding?.[0]?.code;
    if (category !== wantCategory) continue;
    const name = text(r.code);
    const value = obsValue(r);
    if (!name || !value) continue;
    const date = r.effectiveDateTime;
    const prev = latest.get(name);
    if (!prev || (date && prev.date && date > prev.date) || (date && !prev.date)) {
      latest.set(name, { name, value, category, date });
    }
  }
  return [...latest.values()]
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .slice(0, limit);
}

function dedupeBy<T>(items: T[], key: (t: T) => string, limit: number): T[] {
  const seen = new Map<string, T>();
  for (const it of items) {
    const k = key(it);
    if (k && !seen.has(k)) seen.set(k, it);
  }
  return [...seen.values()].slice(0, limit);
}

// ---- load + map ----

let cache: RawRecord[] | null = null;

async function load(): Promise<RawRecord[]> {
  if (cache) return cache;
  const raw = await readFile(DATA_PATH, "utf8");
  cache = raw
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as RawRecord);
  return cache;
}

function toSummary(rec: RawRecord): PatientSummary {
  const enc = rec.encounter_fhir.encounter;
  const setting = deriveSetting(
    enc?.class?.code,
    rec.metadata.visit_type,
    rec.metadata.visit_title,
  );
  const reasonFromCode = (enc?.reasonCode || []).map(text).filter(Boolean)[0];
  const activeConditions = (
    rec.patient_context.longitudinal_summary?.condition_labels || []
  )
    .map(cleanLabel)
    .filter((c) => !/^educated to|level \(finding\)/i.test(c))
    .slice(0, 4);

  return {
    id: rec.id,
    patientId: rec.metadata.patient_id,
    name: personName(rec),
    age: ageAt(rec.patient_context.patient.birthDate, rec.metadata.date),
    sex: rec.patient_context.patient.gender || "unknown",
    mrn: mrnFor(rec.metadata.patient_id),
    visitTitle: rec.metadata.visit_title,
    visitType: rec.metadata.visit_type,
    setting,
    isAdmission: setting !== "Outpatient",
    admitDate: rec.metadata.date,
    status: rec.metadata.status || enc?.status || "unknown",
    reason: cleanLabel(reasonFromCode || rec.metadata.visit_title),
    lengthOfStayDays: losDays(setting, enc?.period?.start, enc?.period?.end),
    activeConditions,
  };
}

function toChart(rec: RawRecord): PatientChart {
  const summary = toSummary(rec);
  const rr = rec.encounter_fhir.related_resources || {};
  const enc = rec.encounter_fhir.encounter;

  const encounterConditions: ConditionItem[] = dedupeBy(
    (rr.Condition || []).map((c) => ({
      name: cleanLabel(text(c.code)),
      status: c.clinicalStatus?.coding?.[0]?.code,
      onset: c.onsetDateTime,
    })),
    (c) => c.name,
    12,
  );

  const medications: MedicationItem[] = dedupeBy(
    (rr.MedicationRequest || []).map((m) => ({
      name:
        text(m.medicationCodeableConcept) || m.medicationReference?.display || "",
      status: m.status,
    })),
    (m) => m.name,
    15,
  ).filter((m) => m.name);

  const diagnosticReports: DiagnosticReportItem[] = dedupeBy(
    (rr.DiagnosticReport || []).map((d) => ({
      name: text(d.code),
      status: d.status,
      date: d.effectiveDateTime,
    })),
    (d) => d.name,
    12,
  ).filter((d) => d.name);

  const reasonCodes = (enc?.reasonCode || []).map(text).filter(Boolean);

  return {
    ...summary,
    maritalStatus: rec.patient_context.patient.maritalStatus?.text,
    encounterReason:
      reasonCodes.map(cleanLabel).join(", ") || summary.visitTitle,
    encounterConditions,
    vitals: pickObservations(rr.Observation || [], "vital-signs", 10),
    labs: pickObservations(rr.Observation || [], "laboratory", 14),
    medications,
    diagnosticReports,
    longitudinalConditions: (
      rec.patient_context.longitudinal_summary?.condition_labels || []
    ).map(cleanLabel),
    longitudinalMedications:
      rec.patient_context.longitudinal_summary?.medication_labels || [],
    note: rec.note,
    afterVisitSummary: rec.after_visit_summary,
    transcript: rec.transcript,
    resourceCounts:
      rec.metadata.related_resource_counts ||
      rec.patient_context.longitudinal_summary?.resource_counts ||
      {},
  };
}

// ---- public API ----

const SETTING_ORDER: Record<Setting, number> = {
  Inpatient: 0,
  SNF: 1,
  Hospice: 2,
  Outpatient: 3,
};

/** Patient list, admissions first (the discharge-planning cohort). */
export async function getPatients(): Promise<PatientSummary[]> {
  const records = await load();
  return records
    .map(toSummary)
    .sort(
      (a, b) =>
        SETTING_ORDER[a.setting] - SETTING_ORDER[b.setting] ||
        b.admitDate.localeCompare(a.admitDate),
    );
}

export async function getPatient(id: string): Promise<PatientChart | undefined> {
  const records = await load();
  const rec = records.find((r) => r.id === id);
  return rec ? toChart(rec) : undefined;
}
