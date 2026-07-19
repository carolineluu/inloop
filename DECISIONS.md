# Decision log

Key decisions made while building inloop, grouped by area.

## Product & scope

- **Project `inloop`** — a discharge-planning tool for doctors and
  multidisciplinary care teams (renamed from the initial `discharge-planner`
  scaffold).
- **Two screens only:** a patient list and a patient chart. The list is a typical
  inpatient list plus a discharge signal; the chart is a typical chart plus
  in-depth discharge planning.
- **Goal:** help teams discharge-plan early and move patients efficiently without
  hurting perceived quality of care.
- **Stack:** kept the existing Next.js 16 / React 19 / Tailwind v4 / TypeScript
  scaffold.

## Data

- **Use the real data, not a generated fixture** — the Abridge synthetic ambient
  FHIR dataset (25 encounters).
- Data copied into the repo (`data-src/`) because macOS blocked `~/Downloads`;
  committed the `.jsonl` + docs, git-ignored the large viewer HTML and duplicate
  JSON.
- **Filter the list to the `Inpatient` setting only.**
- **Added 9 dummy inpatients** (5 Ready / 4 Not ready — hip fracture, UTI, sepsis,
  suicidal ideation, cellulitis, COPD, pneumonia, CHF, GI bleed) with pre-built
  contexts, so the list shows a realistic mix with no model calls.

## AI & discharge logic

- **Claude generates the discharge planning** (not just displaying stored fields),
  from the note + problems + vitals + labs.
- Model **`claude-opus-4-8`, adaptive thinking**, **server-side only**,
  **JSON-schema structured output**.
- **Dropped the `@anthropic-ai/sdk` dependency** — call the Messages API via plain
  `fetch` (also unblocked install).
- **Readiness is derived in code, never free-form** — simplified to **two states**:
  `Ready` only if every clinical milestone is met, else `Not ready`.
- **Milestones use diagnosis-specific clinician language** (leukopenia,
  thrombocytopenia, AKI) rather than lay phrasing.
- **Orders are named as real Epic order sets** (Northwestern Medicine inventory).
- **Hide Documentation-type next steps; orders show the order-set name only.**
- **Milestones sorted worst-first** (not met → improving → met).
- **Cache is disk-backed** (`.discharge-cache/`, git-ignored) with fresh reads, so
  badges persist across restarts and stay in sync between list and chart.

## List UI

- Columns: **Patient · Location · Reason · Admit date · LOS · Discharge readiness**.
- **Replaced the Setting column with a synthetic Location** (bed strings like
  "Med Surg 3 Room 161"), derived stably from the patient id.
- **Discharge readiness is sortable**, default **Ready-first**; header left-aligned
  with the sort icon 24px to its right.
- **Admit date formatted `MM-DD-YY`.**
- **Removed** the "Assess admissions" button and the descriptive subtitle.

## Chart & panel UI

- Renamed labels: **Discharge context → Discharge Planning**, **Readiness
  indicators → Clinical Milestones**, **Doctor to-dos → Next steps**.
- Panel **leads with Suggested disposition** (removed the summary paragraph);
  **removed the Regenerate button**.
- **Discharge Planning is a right-docked drawer** — its own surface with border +
  shadow, under a persistent sticky app-bar header, scrolling internally.
- **Chart reorganized EHR-style**: patient banner with a Location/Admitted/LOS/
  Status facts row, a vitals tile row, and titled clinical sections.

## Engineering & ops

- **Use `npm`** (pnpm kept timing out in this environment); committed
  `package-lock.json` and a `.claude/launch.json` dev config.
- **GitHub repo** `carolineluu/inloop`, committing/pushing incrementally;
  reconciled with the remote by rebase rather than force-push.
- **Treat the pasted API key as exposed** — kept only in `.env.local`; rotate
  recommended.

## Still open

- Real inpatient assessments take ~30–40s (adaptive thinking); the dev-mode
  double-call was noted but not changed.

## Resolved

- Removed the unused `AssessAllButton` component (dead code after the "Assess
  admissions" bulk button was dropped from the list).
