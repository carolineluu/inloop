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
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1 text-sm text-sky-700 hover:underline dark:text-sky-400"
      >
        ← Patient list
      </Link>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PatientChart chart={chart} />
        </div>
        {/* Full-height sticky side rail: stands on its own, separated from the
            chart, and stays pinned as the chart scrolls (scrolls internally). */}
        <aside className="lg:col-span-1">
          <div className="lg:sticky lg:top-6 lg:h-[calc(100vh_-_3rem)]">
            <DischargeContextPanel id={chart.id} />
          </div>
        </aside>
      </div>
    </main>
  );
}
