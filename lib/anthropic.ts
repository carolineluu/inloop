import "server-only";
import type {
  PatientChart,
  DischargeContext,
  DischargeContextModel,
  Readiness,
  ReadinessIndicator,
} from "./types";

// Server-side only. The API key is read from the environment and never reaches
// the browser. See .env.local (git-ignored). We call the Messages API over
// plain fetch to avoid an extra runtime dependency.
const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-opus-4-8";

const SYSTEM_PROMPT = `You are a clinical discharge-planning assistant supporting a hospital's multidisciplinary care team (physicians, nursing, PT/OT, social work, case management).

You are given one patient's encounter: their clinical note, structured problems, vitals, labs, medications, and chart background. The patient may be in an inpatient, skilled-nursing, hospice, or outpatient setting — adapt your indicators to what "ready for the next step of care" means in that setting (discharge home, transfer, step-down, comfort-focused goals met, or safe follow-up). Produce decision-support that helps the team see how close the patient is to that next step and what still needs to happen. Ground every statement in the provided chart — do not invent findings, medications, or results that are not supported by the note or data. If evidence is missing, say so rather than assuming.

Focus on:
- readinessIndicators: the concrete clinical milestones that determine whether this patient can move to the next step of care. Name each "indicator" in precise, diagnosis-specific clinician language — use the actual clinical finding, syndrome, or lab derangement by its medical name, not a lay paraphrase. For example, write "Resolution of leukopenia and thrombocytopenia" rather than "Hematologic recovery (WBC/platelets)"; "Resolution of hypoxemic respiratory failure / weaning of supplemental O2" rather than "off oxygen"; "Resolution of AKI (creatinine/GFR trending to baseline)" rather than "renal function improved". When a specific value or reference derangement is documented, name it (e.g. "Correction of hyponatremia (Na ≥ 130)"). For EACH one, set status to "met", "improving", or "not_met", and quote or paraphrase the specific note/lab it comes from in "evidence". Choose the indicators that actually matter for THIS patient's problem — do not force a fixed checklist.
- doctorTodos: actions the physician still needs to take before or at discharge (documentation, consults, follow-up, and orders). Set "type" accordingly and "priority" when clear. For any todo with type "order", set "task" to the exact Epic ORDER SET NAME the physician would open to place those orders — pick from the ORDER SET REFERENCE list below and copy the name verbatim (use the base name; omit any trailing facility abbreviations). Put the specific orders and clinical rationale in "detail". Only use an order-set name that genuinely fits the clinical need; if none fits, name the closest standard Epic order set rather than inventing a free-text order.
- barriers: non-physician blockers to discharge (DME/equipment, transport, insurance authorization, home services, placement) drawn from the notes.
- suggestedDisposition: the most appropriate destination (e.g. home, home with services, SNF, acute rehab, hospice) based on the chart.
- summary: 1-2 plain sentences a busy clinician can read at a glance.

ORDER SET REFERENCE (Epic inpatient order sets — use these verbatim for type "order" todos):
Admission; COVID-19 Inpatient Orders; Discharge; Discharge: Home Health; Discharge: Diabetes Supplies/Insulin; Electrolyte Replacement; IV Potassium Replacement Protocol; ORAL Potassium Replacement Protocol; IV Magnesium Replacement Protocol; Heparin Therapy; Warfarin Administration; EMERGENT Anticoagulation Reversal; Hyperglycemia Urgency; Hypoglycemia Protocol; Inpatient Intravenous Insulin Therapy; Insulin Infusion: General Protocol; Diabetic Ketoacidosis/HHS; Infection Treatment; Nausea Protocol; Pain Management: General; Total Parenteral Nutrition (TPN); Blood Administration - Inpatient; Intravenous Iron Infusion; Alcohol Withdrawal; Opiate Withdrawal Treatment; Opioid Bowel Protocol; Post Fall Orders; General Medicine ICU Orders; Ventilator Management; Atrial Fibrillation; Congestive Heart Failure; Non-ST Elevation Myocardial Infarction and ST-Elevation Myocardial Infarction; Intermediate Risk Chest Pain; Low Risk Chest Pain; Chest Pain Observation/CDU; COPD/Asthma; Hemodialysis; Continuous Renal Replacement Therapy (CRRT); Ischemic Stroke/TIA; Intracerebral Hemorrhagic Stroke; Hospice Inpatient; Comfort Care Sedation; Palliative Continuous Opioid Infusion; PALLIATIVE PCA Pain Management; End of Life Care for Non-Hospice Patients.

Do NOT output an overall readiness label — that is computed separately from your readinessIndicators. This is decision support and not a substitute for clinical judgment.`;

const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    suggestedDisposition: { type: "string" },
    readinessIndicators: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          indicator: { type: "string" },
          status: { type: "string", enum: ["met", "improving", "not_met"] },
          evidence: { type: "string" },
        },
        required: ["indicator", "status", "evidence"],
      },
    },
    doctorTodos: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          task: { type: "string" },
          type: {
            type: "string",
            enum: ["order", "documentation", "consult", "follow_up"],
          },
          detail: { type: "string" },
          priority: { type: "string", enum: ["high", "medium", "low"] },
        },
        required: ["task", "type", "detail"],
      },
    },
    barriers: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          item: { type: "string" },
          detail: { type: "string" },
        },
        required: ["item", "detail"],
      },
    },
  },
  required: [
    "summary",
    "suggestedDisposition",
    "readinessIndicators",
    "doctorTodos",
    "barriers",
  ],
} as const;

/**
 * Readiness is DERIVED from the indicators, never a free-form judgment:
 * "ready" only when EVERY clinical milestone is met; otherwise "not_ready".
 */
export function deriveReadiness(indicators: ReadinessIndicator[]): Readiness {
  return indicators.length > 0 && indicators.every((i) => i.status === "met")
    ? "ready"
    : "not_ready";
}

function bullets(lines: string[]): string {
  return lines.length ? lines.map((l) => `- ${l}`).join("\n") : "(none recorded)";
}

function buildChartText(chart: PatientChart): string {
  const los =
    chart.lengthOfStayDays != null ? `, length of stay ${chart.lengthOfStayDays}d` : "";
  const vitals = bullets(
    chart.vitals.map((v) => `${v.name}: ${v.value}`),
  );
  const labs = bullets(chart.labs.map((l) => `${l.name}: ${l.value}`));
  const encConditions = bullets(
    chart.encounterConditions.map(
      (c) => `${c.name}${c.status ? ` (${c.status})` : ""}`,
    ),
  );

  return [
    `Patient: ${chart.name}, ${chart.age} ${chart.sex}`,
    `Setting: ${chart.setting} — ${chart.visitTitle}`,
    `Encounter date: ${chart.admitDate.slice(0, 10)}${los}`,
    `Reason for encounter: ${chart.encounterReason}`,
    "",
    "Active problems (longitudinal chart):",
    bullets(chart.longitudinalConditions),
    "",
    "Home medications (longitudinal chart):",
    bullets(chart.longitudinalMedications),
    "",
    "Conditions at this encounter:",
    encConditions,
    "",
    "Vitals (most recent):",
    vitals,
    "",
    "Labs (most recent):",
    labs,
    "",
    "Medications ordered/active this encounter:",
    bullets(chart.medications.map((m) => `${m.name}${m.status ? ` (${m.status})` : ""}`)),
    "",
    "Clinical note (SOAP):",
    chart.note || "(none)",
    "",
    "After-visit summary:",
    chart.afterVisitSummary || "(none)",
  ].join("\n");
}

interface MessagesResponse {
  content?: { type: string; text?: string }[];
  error?: { message?: string };
}

export async function generateDischargeContext(
  patient: PatientChart,
): Promise<DischargeContext> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local (server-side only).",
    );
  }

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4000,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      output_config: { format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
      messages: [
        {
          role: "user",
          content: `Assess discharge readiness for this patient:\n\n${buildChartText(patient)}`,
        },
      ],
    }),
  });

  const data = (await res.json()) as MessagesResponse;
  if (!res.ok) {
    throw new Error(
      data.error?.message || `Anthropic API error (${res.status}).`,
    );
  }

  const textBlock = data.content?.find((b) => b.type === "text" && b.text);
  if (!textBlock?.text) {
    throw new Error("No structured output returned from the model.");
  }

  const model = JSON.parse(textBlock.text) as DischargeContextModel;
  return { ...model, readiness: deriveReadiness(model.readinessIndicators) };
}
