import "server-only";
import type {
  PatientChart,
  DischargeContext,
  ReadinessIndicator,
  DoctorTodo,
  Barrier,
  Observation,
} from "./types";

// Dummy inpatients with pre-built discharge context, so the list/chart show a
// realistic mix without calling the model. 5 are "Ready", 4 are "Not ready".

interface Spec {
  id: string;
  name: string;
  age: number;
  sex: string;
  mrn: string;
  location: string;
  admitDate: string; // ISO
  los: number;
  reason: string;
  conditions: string[];
  meds: string[];
  vitals: [string, string][];
  labs: [string, string][];
  note: string;
  ready: boolean;
  disposition: string;
  indicators: ReadinessIndicator[];
  todos: DoctorTodo[];
  barriers: Barrier[];
}

const SPECS: Spec[] = [
  // ---------- READY (5) ----------
  {
    id: "dummy-uti",
    name: "Beatrice Klein",
    age: 74,
    sex: "female",
    mrn: "MRN-DKLEIN74",
    location: "Med Surg 2 Room 118",
    admitDate: "2025-02-14T09:10:00-06:00",
    los: 3,
    reason: "Urinary tract infection (pyelonephritis)",
    conditions: [
      "Type 2 diabetes mellitus",
      "Essential hypertension",
      "Recurrent urinary tract infection",
    ],
    meds: ["cefpodoxime 200 mg oral BID", "metformin 500 mg BID", "lisinopril 10 mg daily"],
    vitals: [
      ["Temperature", "36.8 C"],
      ["Heart rate", "76 /min"],
      ["Blood pressure", "126/74 mmHg"],
      ["SpO2", "98 %"],
    ],
    labs: [
      ["WBC", "8.1 x10^3/uL"],
      ["Creatinine", "0.9 mg/dL"],
      ["Urine culture", "E. coli, sensitive"],
    ],
    note: "**Subjective:** 74F admitted with pyelonephritis, now afebrile for 48 hours with resolved flank pain. **Objective:** Hemodynamically stable, tolerating a regular diet, ambulating independently. **Assessment/Plan:** Pyelonephritis improved; transitioned from IV ceftriaxone to oral cefpodoxime with a clear plan to complete the course as an outpatient. Ready for discharge home.",
    ready: true,
    disposition: "Home",
    indicators: [
      { indicator: "Afebrile ≥48 hours", status: "met", evidence: "Temp 36.8 C; afebrile since hospital day 1." },
      { indicator: "Transition to oral antibiotics tolerated", status: "met", evidence: "Switched to oral cefpodoxime, tolerating PO." },
      { indicator: "Hemodynamic stability", status: "met", evidence: "BP 126/74, HR 76." },
      { indicator: "Independent ambulation / baseline function", status: "met", evidence: "Ambulating independently per nursing." },
    ],
    todos: [
      { task: "Discharge", type: "order", detail: "" },
      { task: "PCP follow-up in 1 week", type: "follow_up", detail: "Confirm symptom resolution and complete oral antibiotic course." },
    ],
    barriers: [],
  },
  {
    id: "dummy-cellulitis",
    name: "Marcus Webb",
    age: 58,
    sex: "male",
    mrn: "MRN-MWEBB58A",
    location: "Med Surg 4 Room 42",
    admitDate: "2025-03-02T14:20:00-06:00",
    los: 4,
    reason: "Lower extremity cellulitis",
    conditions: ["Type 2 diabetes mellitus", "Obesity", "Chronic venous insufficiency"],
    meds: ["cephalexin 500 mg oral QID", "metformin 1000 mg BID"],
    vitals: [
      ["Temperature", "36.9 C"],
      ["Heart rate", "80 /min"],
      ["Blood pressure", "132/78 mmHg"],
      ["SpO2", "97 %"],
    ],
    labs: [
      ["WBC", "7.4 x10^3/uL"],
      ["Lactate", "1.0 mmol/L"],
    ],
    note: "**Subjective:** 58M with left lower-extremity cellulitis, now with markedly reduced erythema and no fever. **Objective:** Borders receding and marked; afebrile. **Assessment/Plan:** Cellulitis improving on antibiotics; transitioned to oral cephalexin. Cleared for discharge with outpatient follow-up.",
    ready: true,
    disposition: "Home",
    indicators: [
      { indicator: "Resolution of systemic infection (afebrile, WBC normalizing)", status: "met", evidence: "Afebrile, WBC 7.4." },
      { indicator: "Erythema regression on marked borders", status: "met", evidence: "Borders receded from prior marking." },
      { indicator: "Transition to oral antibiotics tolerated", status: "met", evidence: "On oral cephalexin, tolerating PO." },
    ],
    todos: [
      { task: "Discharge", type: "order", detail: "" },
      { task: "Wound check with PCP in 3–5 days", type: "follow_up", detail: "Reassess borders and complete antibiotic course." },
    ],
    barriers: [],
  },
  {
    id: "dummy-hipfx",
    name: "Gloria Sanders",
    age: 81,
    sex: "female",
    mrn: "MRN-GSAND81C",
    location: "Ortho 3 Room 205",
    admitDate: "2025-01-20T07:45:00-06:00",
    los: 5,
    reason: "Hip fracture, status post ORIF",
    conditions: ["Osteoporosis", "Hypertension", "Hypothyroidism"],
    meds: ["acetaminophen 1 g oral TID", "enoxaparin 40 mg SC daily", "levothyroxine 75 mcg daily"],
    vitals: [
      ["Temperature", "36.7 C"],
      ["Heart rate", "72 /min"],
      ["Blood pressure", "134/76 mmHg"],
      ["SpO2", "97 %"],
    ],
    labs: [
      ["Hemoglobin", "10.8 g/dL"],
      ["WBC", "7.9 x10^3/uL"],
    ],
    note: "**Subjective:** 81F post-op day 3 from ORIF of a right hip fracture, pain well controlled on oral analgesia. **Objective:** Incision clean and dry, afebrile. **Assessment/Plan:** Cleared by PT for transfer with assist; VTE prophylaxis in place. Appropriate for acute rehab.",
    ready: true,
    disposition: "Acute rehabilitation",
    indicators: [
      { indicator: "Post-operative pain controlled on oral analgesia", status: "met", evidence: "Comfortable on scheduled acetaminophen." },
      { indicator: "Cleared by physical therapy for transfer", status: "met", evidence: "PT cleared for transfer with assist." },
      { indicator: "Surgical wound healing without infection", status: "met", evidence: "Incision clean/dry/intact; afebrile." },
      { indicator: "Hemodynamic and hematologic stability", status: "met", evidence: "Hgb stable at 10.8, vitals stable." },
    ],
    todos: [
      { task: "Discharge: Home Health", type: "order", detail: "" },
      { task: "Orthopedic surgery follow-up in 2 weeks", type: "follow_up", detail: "Wound check and weight-bearing progression." },
    ],
    barriers: [
      { item: "Acute rehab bed", detail: "Confirm accepting facility and transport." },
    ],
  },
  {
    id: "dummy-copd",
    name: "Harold Chen",
    age: 69,
    sex: "male",
    mrn: "MRN-HCHEN69D",
    location: "Tele 3 Room 61",
    admitDate: "2025-02-28T18:00:00-06:00",
    los: 4,
    reason: "COPD exacerbation",
    conditions: ["COPD", "Former tobacco use", "Hyperlipidemia"],
    meds: ["prednisone taper", "albuterol/ipratropium nebs", "atorvastatin 40 mg daily"],
    vitals: [
      ["Temperature", "36.8 C"],
      ["Heart rate", "84 /min"],
      ["Respiratory rate", "18 /min"],
      ["SpO2", "94 % on room air"],
    ],
    labs: [
      ["WBC", "8.6 x10^3/uL"],
      ["Bicarbonate", "27 mmol/L"],
    ],
    note: "**Subjective:** 69M with COPD exacerbation, now back to baseline dyspnea. **Objective:** SpO2 94% on room air, no accessory muscle use. **Assessment/Plan:** Weaned off supplemental oxygen; completing steroid taper and inhalers. Ready for discharge with pulmonary follow-up.",
    ready: true,
    disposition: "Home",
    indicators: [
      { indicator: "Weaned to room air at baseline SpO2", status: "met", evidence: "SpO2 94% on room air." },
      { indicator: "Return to baseline respiratory status", status: "met", evidence: "No accessory muscle use; baseline dyspnea." },
      { indicator: "Tolerating oral steroid/inhaler regimen", status: "met", evidence: "On prednisone taper and nebs." },
    ],
    todos: [
      { task: "Discharge", type: "order", detail: "" },
      { task: "Pulmonology follow-up in 1–2 weeks", type: "follow_up", detail: "Inhaler technique review and taper completion." },
    ],
    barriers: [],
  },
  {
    id: "dummy-pna",
    name: "Ruth Delgado",
    age: 77,
    sex: "female",
    mrn: "MRN-RDELG77E",
    location: "Med Surg 2 Room 130",
    admitDate: "2025-03-05T11:30:00-06:00",
    los: 4,
    reason: "Community-acquired pneumonia",
    conditions: ["Hypertension", "Atrial fibrillation", "Chronic kidney disease stage 3"],
    meds: ["amoxicillin/clavulanate 875 mg oral BID", "apixaban 5 mg BID", "amlodipine 5 mg daily"],
    vitals: [
      ["Temperature", "36.9 C"],
      ["Heart rate", "78 /min"],
      ["Respiratory rate", "17 /min"],
      ["SpO2", "96 % on room air"],
    ],
    labs: [
      ["WBC", "9.0 x10^3/uL"],
      ["Creatinine", "1.3 mg/dL"],
    ],
    note: "**Subjective:** 77F with community-acquired pneumonia, now afebrile with improved cough. **Objective:** SpO2 96% on room air; tolerating diet. **Assessment/Plan:** Transitioned to oral antibiotics; off oxygen. Ready for discharge home.",
    ready: true,
    disposition: "Home",
    indicators: [
      { indicator: "Afebrile and clinically improving", status: "met", evidence: "Afebrile with improved cough." },
      { indicator: "Weaned off supplemental oxygen", status: "met", evidence: "SpO2 96% on room air." },
      { indicator: "Transition to oral antibiotics tolerated", status: "met", evidence: "On oral amoxicillin/clavulanate." },
    ],
    todos: [
      { task: "Discharge", type: "order", detail: "" },
      { task: "PCP follow-up in 1 week", type: "follow_up", detail: "Confirm resolution; repeat imaging if symptoms persist." },
    ],
    barriers: [],
  },
  // ---------- NOT READY (4) ----------
  {
    id: "dummy-sepsis",
    name: "Frank Osei",
    age: 65,
    sex: "male",
    mrn: "MRN-FOSEI65F",
    location: "ICU 2 Room 271",
    admitDate: "2025-03-08T02:15:00-06:00",
    los: 2,
    reason: "Sepsis (urosepsis)",
    conditions: ["Benign prostatic hyperplasia", "Type 2 diabetes mellitus", "Hypertension"],
    meds: ["piperacillin/tazobactam IV", "norepinephrine infusion (weaning)", "IV fluids"],
    vitals: [
      ["Temperature", "38.6 C"],
      ["Heart rate", "108 /min"],
      ["Blood pressure", "98/58 mmHg"],
      ["SpO2", "95 %"],
    ],
    labs: [
      ["WBC", "18.4 x10^3/uL"],
      ["Lactate", "3.1 mmol/L"],
      ["Creatinine", "1.8 mg/dL"],
    ],
    note: "**Subjective:** 65M with urosepsis, still febrile and requiring low-dose vasopressor support. **Objective:** Tachycardic, borderline hypotensive; lactate elevated. **Assessment/Plan:** Active sepsis with ongoing resuscitation and IV antibiotics. Not appropriate for discharge; continued ICU-level care.",
    ready: false,
    disposition: "Continued inpatient care; disposition deferred until stabilized",
    indicators: [
      { indicator: "Lactate normalization", status: "not_met", evidence: "Lactate 3.1 mmol/L, still elevated." },
      { indicator: "Off vasopressor support", status: "improving", evidence: "Weaning norepinephrine." },
      { indicator: "Afebrile", status: "not_met", evidence: "Temp 38.6 C." },
      { indicator: "Resolution of acute kidney injury", status: "not_met", evidence: "Creatinine 1.8 mg/dL, above baseline." },
    ],
    todos: [
      { task: "Infection Treatment", type: "order", detail: "Continue broad-spectrum IV antibiotics; de-escalate per cultures." },
      { task: "Electrolyte Replacement", type: "order", detail: "Replete per protocol during resuscitation." },
    ],
    barriers: [],
  },
  {
    id: "dummy-psych",
    name: "Daniel Pierce",
    age: 34,
    sex: "male",
    mrn: "MRN-DPIER34G",
    location: "Obs Tele Room 214",
    admitDate: "2025-03-09T21:40:00-06:00",
    los: 2,
    reason: "Suicidal ideation, major depressive disorder",
    conditions: ["Major depressive disorder", "Generalized anxiety disorder"],
    meds: ["sertraline 50 mg daily"],
    vitals: [
      ["Temperature", "36.7 C"],
      ["Heart rate", "74 /min"],
      ["Blood pressure", "120/72 mmHg"],
      ["SpO2", "99 %"],
    ],
    labs: [
      ["Ethanol", "negative"],
      ["Acetaminophen", "negative"],
    ],
    note: "**Subjective:** 34M admitted with active suicidal ideation. **Objective:** Medically stable; on 1:1 observation. **Assessment/Plan:** Medically clear but not psychiatrically cleared; awaiting inpatient psychiatric placement. Not safe for discharge.",
    ready: false,
    disposition: "Inpatient psychiatric transfer pending",
    indicators: [
      { indicator: "Resolution of active suicidal ideation", status: "not_met", evidence: "Active SI documented; on 1:1." },
      { indicator: "Psychiatry clearance", status: "not_met", evidence: "Not yet cleared by psychiatry." },
      { indicator: "Safety plan established", status: "not_met", evidence: "No safety plan finalized." },
    ],
    todos: [
      { task: "Psychiatry evaluation", type: "consult", detail: "Risk assessment and disposition planning." },
      { task: "Admission: Inpatient Psychiatric", type: "order", detail: "On acceptance to a psychiatric facility." },
    ],
    barriers: [
      { item: "Inpatient psychiatric bed", detail: "Awaiting accepting facility and transport." },
    ],
  },
  {
    id: "dummy-chf",
    name: "Evelyn Torres",
    age: 72,
    sex: "female",
    mrn: "MRN-ETORR72H",
    location: "Tele 3 Room 41",
    admitDate: "2025-03-06T16:05:00-06:00",
    los: 3,
    reason: "Acute decompensated heart failure",
    conditions: [
      "Heart failure with reduced ejection fraction",
      "Chronic kidney disease stage 3",
      "Type 2 diabetes mellitus",
    ],
    meds: ["furosemide IV", "carvedilol 12.5 mg BID", "sacubitril/valsartan"],
    vitals: [
      ["Temperature", "36.6 C"],
      ["Heart rate", "88 /min"],
      ["Blood pressure", "118/70 mmHg"],
      ["SpO2", "95 %"],
    ],
    labs: [
      ["BNP", "1420 pg/mL"],
      ["Creatinine", "1.6 mg/dL"],
      ["Potassium", "3.4 mmol/L"],
    ],
    note: "**Subjective:** 72F with acute decompensated heart failure, still short of breath on exertion. **Objective:** 3 L net positive; mild pedal edema persists. **Assessment/Plan:** Ongoing IV diuresis; not yet at dry weight and still on IV diuretics. Continue inpatient management.",
    ready: false,
    disposition: "Home with home health once euvolemic",
    indicators: [
      { indicator: "Achievement of euvolemia / target dry weight", status: "not_met", evidence: "Net 3 L positive; residual edema." },
      { indicator: "Transition from IV to oral diuretics", status: "not_met", evidence: "Still on IV furosemide." },
      { indicator: "Stable renal function during diuresis", status: "improving", evidence: "Creatinine 1.6, trending." },
    ],
    todos: [
      { task: "Congestive Heart Failure", type: "order", detail: "Continue IV diuresis; daily weights and strict I/O." },
      { task: "Electrolyte Replacement", type: "order", detail: "Replete potassium (K 3.4) during diuresis." },
    ],
    barriers: [],
  },
  {
    id: "dummy-gib",
    name: "Samuel Rhodes",
    age: 60,
    sex: "male",
    mrn: "MRN-SRHOD60J",
    location: "Med Surg 4 Room 36",
    admitDate: "2025-03-07T05:30:00-06:00",
    los: 2,
    reason: "Upper gastrointestinal bleed",
    conditions: ["Peptic ulcer disease", "Alcohol use disorder", "Hypertension"],
    meds: ["pantoprazole IV infusion", "IV fluids"],
    vitals: [
      ["Temperature", "36.8 C"],
      ["Heart rate", "102 /min"],
      ["Blood pressure", "104/64 mmHg"],
      ["SpO2", "98 %"],
    ],
    labs: [
      ["Hemoglobin", "7.6 g/dL"],
      ["BUN", "34 mg/dL"],
      ["INR", "1.3"],
    ],
    note: "**Subjective:** 60M with an upper GI bleed and melena, tachycardic. **Objective:** Hemoglobin 7.6 and dropping; received transfusion. **Assessment/Plan:** Active bleeding not yet confirmed controlled; awaiting endoscopy. NPO. Not appropriate for discharge.",
    ready: false,
    disposition: "Continued inpatient care pending endoscopy",
    indicators: [
      { indicator: "Hemodynamic stability without active bleeding", status: "not_met", evidence: "HR 102, BP 104/64; ongoing melena." },
      { indicator: "Hemoglobin stable off transfusion", status: "not_met", evidence: "Hgb 7.6 and dropping; transfused." },
      { indicator: "Endoscopic evaluation completed", status: "not_met", evidence: "EGD pending." },
    ],
    todos: [
      { task: "Blood Administration - Inpatient", type: "order", detail: "Transfuse to keep Hgb ≥ 7; type and cross." },
      { task: "GI consult for urgent endoscopy", type: "consult", detail: "EGD for diagnosis and hemostasis." },
    ],
    barriers: [],
  },
];

function obs([name, value]: [string, string]): Observation {
  return { name, value };
}

function toChart(s: Spec): PatientChart {
  return {
    id: s.id,
    patientId: s.id,
    name: s.name,
    age: s.age,
    sex: s.sex,
    mrn: s.mrn,
    location: s.location,
    visitTitle: s.reason,
    visitType: "Hospital admission (procedure)",
    setting: "Inpatient",
    isAdmission: true,
    admitDate: s.admitDate,
    status: "in-progress",
    reason: s.reason,
    lengthOfStayDays: s.los,
    activeConditions: s.conditions.slice(0, 4),
    maritalStatus: undefined,
    encounterReason: s.reason,
    encounterConditions: s.conditions.map((name) => ({ name, status: "active" })),
    vitals: s.vitals.map(obs),
    labs: s.labs.map(obs),
    medications: s.meds.map((name) => ({ name })),
    diagnosticReports: [],
    longitudinalConditions: s.conditions,
    longitudinalMedications: s.meds,
    note: s.note,
    afterVisitSummary: "",
    transcript: "",
    resourceCounts: {},
  };
}

function toContext(s: Spec): DischargeContext {
  return {
    readiness: s.ready ? "ready" : "not_ready",
    summary: "",
    suggestedDisposition: s.disposition,
    readinessIndicators: s.indicators,
    doctorTodos: s.todos,
    barriers: s.barriers,
  };
}

const CHARTS: PatientChart[] = SPECS.map(toChart);
const CONTEXTS = new Map<string, DischargeContext>(
  SPECS.map((s) => [s.id, toContext(s)]),
);

export function getDummyPatients(): PatientChart[] {
  return CHARTS;
}

export function getDummyPatient(id: string): PatientChart | undefined {
  return CHARTS.find((c) => c.id === id);
}

export function getDummyContext(id: string): DischargeContext | undefined {
  return CONTEXTS.get(id);
}

export function isDummy(id: string): boolean {
  return CONTEXTS.has(id);
}
