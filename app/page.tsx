import { getPatients } from "@/lib/data";
import { getCachedContext } from "@/lib/context-cache";
import { PatientListTable } from "@/components/PatientListTable";
import type { Readiness } from "@/lib/types";

// Always render fresh so newly-cached readiness shows after "Assess".
export const dynamic = "force-dynamic";

export default async function Home() {
  // Inpatient census only.
  const patients = (await getPatients()).filter(
    (p) => p.setting === "Inpatient",
  );

  const readinessById: Record<string, Readiness | undefined> = {};
  for (const p of patients) {
    readinessById[p.id] = getCachedContext(p.id)?.readiness;
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Patient list
        </h1>
      </div>

      <PatientListTable patients={patients} readinessById={readinessById} />

      <p className="mt-4 text-xs text-zinc-400 dark:text-zinc-500">
        Prototype using fully synthetic data (Abridge / Synthea). Discharge
        context is AI-generated decision support — not a substitute for clinical
        judgment.
      </p>
    </main>
  );
}
