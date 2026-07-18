// Domain model for inloop, mapped from the Abridge "synthetic ambient FHIR"
// dataset (one clinical encounter per patient). The raw records are FHIR R4
// wrapped with an ambient transcript + generated note; lib/data.ts parses them
// into the view models below.

export type Setting = "Inpatient" | "SNF" | "Hospice" | "Outpatient";

export type Readiness = "ready" | "nearly_ready" | "not_ready";

/** One row in the patient list. */
export interface PatientSummary {
  /** Record id, "<patientId>::<encounterId>". Used in URLs and the API. */
  id: string;
  patientId: string;
  name: string;
  age: number;
  sex: string;
  /** Short human-facing medical record number derived from the patient id. */
  mrn: string;
  visitTitle: string;
  visitType: string;
  setting: Setting;
  /** True for Inpatient / SNF / Hospice — the discharge-planning cohort. */
  isAdmission: boolean;
  /** Encounter start (admit) date, ISO. */
  admitDate: string;
  /** Encounter status, e.g. "finished", "in-progress". */
  status: string;
  /** Primary reason / working diagnosis for the encounter. */
  reason: string;
  /** Length of stay in days when the encounter has ended, else null. */
  lengthOfStayDays: number | null;
  /** Top active problems from the longitudinal chart, for the list glance. */
  activeConditions: string[];
}

export interface ConditionItem {
  name: string;
  status?: string;
  onset?: string;
}

export interface Observation {
  name: string;
  value: string;
  unit?: string;
  category?: string;
  date?: string;
}

export interface MedicationItem {
  name: string;
  status?: string;
}

export interface DiagnosticReportItem {
  name: string;
  status?: string;
  date?: string;
}

/** Full chart view for the detail page. */
export interface PatientChart extends PatientSummary {
  maritalStatus?: string;
  encounterReason: string;
  encounterConditions: ConditionItem[];
  /** Deduped, most-recent vitals recorded at this encounter. */
  vitals: Observation[];
  /** Deduped, most-recent key labs recorded at this encounter. */
  labs: Observation[];
  medications: MedicationItem[];
  diagnosticReports: DiagnosticReportItem[];
  longitudinalConditions: string[];
  longitudinalMedications: string[];
  /** SOAP-style clinical note (markdown). */
  note: string;
  afterVisitSummary: string;
  transcript: string;
  resourceCounts: Record<string, number>;
}

// ---- Discharge context (AI-generated recommendations) ----

export type IndicatorStatus = "met" | "improving" | "not_met";

export interface ReadinessIndicator {
  indicator: string; // e.g. "Off supplemental oxygen"
  status: IndicatorStatus;
  evidence: string; // cites the note/lab it was drawn from
}

export type TodoType = "order" | "documentation" | "consult" | "follow_up";
export type Priority = "high" | "medium" | "low";

export interface DoctorTodo {
  task: string;
  type: TodoType;
  detail: string;
  priority?: Priority;
}

export interface Barrier {
  item: string;
  detail: string;
}

/** The shape Claude returns (readiness is derived in code, so it is omitted here). */
export interface DischargeContextModel {
  readinessIndicators: ReadinessIndicator[];
  summary: string;
  doctorTodos: DoctorTodo[];
  barriers: Barrier[];
  suggestedDisposition: string;
}

/** The shape the API/UI consume (readiness computed from the indicators). */
export interface DischargeContext extends DischargeContextModel {
  readiness: Readiness;
}
