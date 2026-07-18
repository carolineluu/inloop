# inloop — discharge-context viewer for care teams

A web interface for doctors and multidisciplinary care teams to review their
patient list and open a patient chart. The differentiator over a typical
patient-list app is **discharge context**: for each patient, the Claude API
reads the clinical note, problems, vitals, and labs and returns discharge
**recommendations** — readiness, the physician's remaining to-dos (including
orders to place), and blockers. This helps the team discharge-plan early and
move patients efficiently without sacrificing their perception of care.

> Prototype built on a fully **synthetic** dataset. AI output is decision
> support, **not** a substitute for clinical judgment.

## Two screens

1. **Patient list** (`/`) — a typical inpatient list (admissions first) with an
   added **discharge-readiness** column. Readiness badges populate from the
   AI assessment; an **Assess admissions** button generates them in bulk.
2. **Patient chart** (`/patients/[id]`) — a typical chart (demographics,
   encounter reason, problems, vitals, labs, medications, diagnostic reports,
   SOAP note, after-visit summary, ambient transcript) with an in-depth
   **Discharge context** panel.

## Data

Built on the Abridge **synthetic ambient FHIR** dataset (`data-src/`): 25
clinical encounters from 25 synthetic patients (Synthea FHIR R4 + ambient
transcript + generated note). The cohort spans inpatient, skilled-nursing,
hospice, and outpatient settings; the 6 admissions are the discharge-planning
focus. `lib/data.ts` parses `synthetic-ambient-fhir-25.jsonl` into the app's
view models.

## Discharge context (AI)

`lib/anthropic.ts` calls Claude (`claude-opus-4-8`, adaptive thinking) with the
patient's note + structured chart and requests a structured
(`output_config.format` / JSON schema) result:

- **`readinessIndicators`** — clinical milestones that determine readiness
  (e.g. off supplemental oxygen, renal function improved, ambulating, tolerating
  PO), each `met` / `improving` / `not_met` with cited evidence. **These drive readiness.**
- **`readiness`** — **derived in code, not free-form**: all `met` → `ready`;
  none `not_met` but some `improving` → `nearly_ready`; any `not_met` → `not_ready`.
- **`doctorTodos`** — physician actions, with **orders to place** called out distinctly.
- **`barriers`** — non-physician blockers (DME, transport, insurance, placement).
- **`suggestedDisposition`** — home / home with services / SNF / rehab / hospice.

The call is **server-side only** (API route `app/api/discharge-context`), so the
key never reaches the browser. Results are cached in memory per record for the
session (see `lib/context-cache.ts`); "Regenerate" bypasses the cache.

## Architecture

| Path | Role |
| --- | --- |
| `lib/types.ts` | Domain model (`PatientSummary`, `PatientChart`, `DischargeContext`) |
| `lib/data.ts` | Parses the FHIR jsonl → view models; `getPatients()`, `getPatient(id)` |
| `lib/anthropic.ts` | Claude client, prompt, JSON-schema output, `deriveReadiness()` |
| `lib/context-cache.ts` | Session in-memory cache shared by the route and the list |
| `app/api/discharge-context/route.ts` | `POST { id }` → `DischargeContext` |
| `app/page.tsx` | Patient list |
| `app/patients/[id]/page.tsx` | Patient chart + discharge panel |
| `components/` | `PatientListTable`, `PatientChart`, `DischargeContextPanel`, badges |

Stack: Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · TypeScript ·
`@anthropic-ai/sdk`.

## Getting started

```bash
pnpm install
# Server-side key (git-ignored via .env*). Never commit this.
echo 'ANTHROPIC_API_KEY=sk-ant-...' > .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Open a patient (admissions
are at the top) to see the discharge-context panel generate.

## Security

`ANTHROPIC_API_KEY` lives only in `.env.local` (git-ignored) and is used only in
server code — it is never committed and never sent to the browser. If a key was
ever pasted into a chat or shared, rotate it at
<https://console.anthropic.com/settings/keys>.
