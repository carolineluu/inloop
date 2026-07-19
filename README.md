# inloop — discharge-planning viewer for care teams

Made by [Jhonatan Munoz MD](https://www.linkedin.com/in/jhonatan-munoz-md-00735992/), [Caroline Luu](https://www.linkedin.com/in/carolineluu/), and Claude. View the demo
[here](https://www.loom.com/share/ab67edc64dc640838f4c9ac1e47db371).

A web interface for doctors and multidisciplinary care teams to review their
inpatient list and open a patient chart. The differentiator over a typical
patient-list app is **discharge planning**: for each patient, Claude reads the
clinical note, problems, vitals, and labs and returns clinical milestones, the
physician's remaining next steps (including orders to place), blockers, and a
suggested disposition. This helps the team discharge-plan early and move
patients efficiently without sacrificing their perception of care.

> Prototype built on **synthetic** data. AI output is decision support, **not**
> a substitute for clinical judgment.

## Two screens

1. **Patient list** (`/`) — an inpatient census with **Location** (bed), reason
   for encounter, admit date, LOS, and a **sortable Discharge readiness** column
   (defaults to Ready-first). Badges are `Ready` / `Not ready` / `Not assessed`.
2. **Patient chart** (`/patients/[id]`) — an EHR-style chart on the left
   (patient banner with a Location/Admitted/LOS/Status facts row, a vitals tile
   row, and titled sections: encounter reason, problem list, medications, labs,
   diagnostic reports, clinical note) with a **right-docked Discharge Planning
   drawer** on the right.

## Data

- **Real:** the Abridge **synthetic ambient FHIR** dataset (`data-src/`) — 25
  encounters (Synthea FHIR R4 + ambient transcript + generated note).
  `lib/data.ts` parses `synthetic-ambient-fhir-25.jsonl`; the list is filtered to
  the **Inpatient** setting.
- **Demo:** `lib/dummy.ts` adds **9 dummy inpatients** (5 Ready / 4 Not ready —
  hip fracture, UTI, sepsis, suicidal ideation, cellulitis, COPD, pneumonia, CHF,
  GI bleed) with full charts and **pre-built discharge context**, so the list
  shows a realistic mix without any model calls.

## Discharge planning (AI)

`lib/anthropic.ts` calls Claude (`claude-opus-4-8`, adaptive thinking) through
the Messages API over plain `fetch` (no SDK dependency), **server-side only**, and
requests a structured (`output_config.format` / JSON schema) result:

- **`readinessIndicators`** (UI: **Clinical Milestones**) — diagnosis-specific
  milestones in clinician language (e.g. resolution of AKI, correction of
  thrombocytopenia), each `met` / `improving` / `not_met` with cited evidence.
  **These drive readiness.**
- **`readiness`** — **derived in code** (`deriveReadiness`), not free-form:
  `ready` only when **every** milestone is `met`; otherwise `not_ready`.
- **`doctorTodos`** (UI: **Next steps**) — physician actions; `order`-type items
  are named verbatim as **Epic order sets** (from the Northwestern Medicine
  inventory). Documentation-type items are hidden in the UI.
- **`barriers`** and **`suggestedDisposition`** (home / home with services / SNF
  / rehab / hospice).

The `ANTHROPIC_API_KEY` never reaches the browser. Results are cached to disk
(`.discharge-cache/`, git-ignored) so the readiness badge persists across dev
recompiles and restarts. Dummy patients short-circuit to their fixed context.

## Architecture

| Path | Role |
| --- | --- |
| `lib/types.ts` | Domain model (`PatientSummary`, `PatientChart`, `DischargeContext`) |
| `lib/data.ts` | Parses the FHIR jsonl and merges the dummy inpatients; `getPatients()`, `getPatient(id)` |
| `lib/dummy.ts` | 9 dummy inpatients + their fixed discharge contexts |
| `lib/anthropic.ts` | Messages-API call via `fetch`, prompt + Epic order-set reference, JSON-schema output, `deriveReadiness()` |
| `lib/context-cache.ts` | Disk-backed context cache shared by the route and the list |
| `app/api/discharge-context/route.ts` | `POST { id }` → `DischargeContext` (dummy patients return their fixed context) |
| `app/page.tsx` | Patient list (inpatient census) |
| `app/patients/[id]/page.tsx` | EHR chart + docked discharge drawer |
| `components/` | `PatientListTable`, `PatientChart`, `DischargeContextPanel`, `badges` |

Stack: Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · TypeScript. Claude
is called through the Messages API via `fetch` — no `@anthropic-ai/sdk`
dependency.

## Getting started

```bash
npm install
# Server-side key (git-ignored via .env*). Never commit this.
echo 'ANTHROPIC_API_KEY=sk-ant-...' > .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Real inpatients generate
their discharge planning live on first chart open (~30–40s with adaptive
thinking) and then cache; the 9 dummy patients render instantly.

## Security

`ANTHROPIC_API_KEY` lives only in `.env.local` (git-ignored) and is used only in
server code — it is never committed and never sent to the browser. If a key was
ever pasted into a chat or shared, rotate it at
<https://console.anthropic.com/settings/keys>.
