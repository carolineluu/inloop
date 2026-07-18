import Link from "next/link";
import type { PatientSummary, Readiness } from "@/lib/types";
import { SettingBadge, ReadinessBadge } from "./badges";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function PatientListTable({
  patients,
  readinessById,
}: {
  patients: PatientSummary[];
  readinessById: Record<string, Readiness | undefined>;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-[880px] text-left text-sm">
        <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
          <tr>
            <th className="px-4 py-3 font-medium">Patient</th>
            <th className="px-4 py-3 font-medium">Setting</th>
            <th className="px-4 py-3 font-medium">Reason for encounter</th>
            <th className="px-4 py-3 font-medium">Admit date</th>
            <th className="px-4 py-3 font-medium">LOS</th>
            <th className="px-4 py-3 font-medium">Discharge readiness</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {patients.map((p) => (
            <tr
              key={p.id}
              className="group transition-colors hover:bg-sky-50/70 dark:hover:bg-sky-950/30"
            >
              <td className="px-4 py-3">
                <Link
                  href={`/patients/${encodeURIComponent(p.id)}`}
                  className="font-medium text-sky-700 underline-offset-2 group-hover:underline dark:text-sky-400"
                >
                  {p.name}
                </Link>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  {p.age} · {p.sex} ·{" "}
                  <span className="font-mono">{p.mrn}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <SettingBadge setting={p.setting} />
              </td>
              <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                {p.reason}
              </td>
              <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                {fmtDate(p.admitDate)}
              </td>
              <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                {p.lengthOfStayDays != null ? `${p.lengthOfStayDays}d` : "—"}
              </td>
              <td className="px-4 py-3">
                <ReadinessBadge readiness={readinessById[p.id]} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
