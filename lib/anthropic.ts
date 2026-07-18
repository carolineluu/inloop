import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type {
  PatientChart,
  DischargeContext,
  DischargeContextModel,
  Readiness,
  ReadinessIndicator,
} from "./types";

// Server-side only. The API key is read from the environment and never reaches
// the browser. See .env.local (git-ignored).
const client = new Anthropic();

const MODEL = "claude-opus-4-8";

const SYSTEM_PROMPT = `You are a clinical discharge-planning assistant supporting a hospital's multidisciplinary care team (physicians, nursing, PT/OT, social work, case management).

You are given one patient's encounter: their clinical note, structured problems, vitals, labs, medications, and chart background. The patient may be in an inpatient, skilled-nursing, hospice, or outpatient setting — adapt your indicators to what "ready for the next step of care" means in that setting (discharge home, transfer, step-down, comfort-focused goals met, or safe follow-up). Produce decision-support that helps the team see how close the patient is to that next step and what still needs to happen. Ground every statement in the provided chart — do not invent findings, medications, or results that are not supported by the note or data. If evidence is missing, say so rather than assuming.

Focus on:
- readinessIndicators: the concrete clinical milestones that determine whether this patient can go home (e.g. off supplemental oxygen, renal function improved, ambulating safely, tolerating oral intake, afebrile, hemodynamically stable). For EACH one, set status to "met", "improving", or "not_met", and quote or paraphrase the specific note/lab it comes from in "evidence". Choose the indicators that actually matter for THIS patient's problem — do not force a fixed checklist.
- doctorTodos: actions the physician still needs to take before or at discharge. Explicitly include orders that need to be placed (e.g. transition IV to oral antibiotics, place home oxygen order, prescriptions, recheck labs), plus documentation, consults, and follow-up. Set "type" accordingly and "priority" when clear.
- barriers: non-physician blockers to discharge (DME/equipment, transport, insurance authorization, home services, placement) drawn from the notes.
- suggestedDisposition: the most appropriate destination (e.g. home, home with services, SNF, acute rehab, hospice) based on the chart.
- summary: 1-2 plain sentences a busy clinician can read at a glance.

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
 *  - any not_met      -> not_ready
 *  - none not_met but some improving -> nearly_ready
 *  - all met          -> ready
 */
export function deriveReadiness(indicators: ReadinessIndicator[]): Readiness {
  if (indicators.length === 0) return "not_ready";
  if (indicators.some((i) => i.status === "not_met")) return "not_ready";
  if (indicators.some((i) => i.status === "improving")) return "nearly_ready";
  return "ready";
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

export async function generateDischargeContext(
  patient: PatientChart,
): Promise<DischargeContext> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    thinking: { type: "adaptive" },
    system: SYSTEM_PROMPT,
    output_config: {
      format: {
        type: "json_schema",
        schema: OUTPUT_SCHEMA,
      },
    },
    messages: [
      {
        role: "user",
        content: `Assess discharge readiness for this patient:\n\n${buildChartText(patient)}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No structured output returned from the model.");
  }

  const model = JSON.parse(textBlock.text) as DischargeContextModel;
  return { ...model, readiness: deriveReadiness(model.readinessIndicators) };
}
