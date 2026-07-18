import Link from "next/link";
import { notFound } from "next/navigation";
import { getPatient } from "@/lib/data";
import { PatientChart } from "@/components/PatientChart";
import { DischargeContextPanel } from "@/components/DischargeContextPanel";

export const dynamic = "force-dynamic";

export default async function PatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const chart = await getPatient(decodeURIComponent(id));
  if (!chart) notFound();

  return (
    <div className="flex-1 lg:flex lg:items-start">
      {/* EHR area (patient chart) */}
      <div className="min-w-0 flex-1 px-6 py-8">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-sky-700 hover:underline dark:text-sky-400"
        >
          ← Patient list
        </Link>
        <div className="mx-auto max-w-4xl">
          <PatientChart chart={chart} />
        </div>
      </div>

      {/* Discharge planning — its own right-docked drawer, separated from the
          EHR by a border + shadow, pinned below the header, scrolls internally. */}
      <aside className="border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 lg:sticky lg:top-14 lg:h-[calc(100vh_-_3.5rem)] lg:w-[420px] lg:shrink-0 lg:overflow-y-auto lg:border-l lg:border-t-0 lg:shadow-[-12px_0_30px_-18px_rgba(0,0,0,0.25)]">
        <DischargeContextPanel id={chart.id} />
      </aside>
    </div>
  );
}
