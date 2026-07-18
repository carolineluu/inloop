"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PatientSummary, Readiness } from "@/lib/types";
import { ReadinessBadge } from "./badges";

// MM-DD-YY, taken from the ISO date part (no timezone shift).
function fmtDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${m}-${d}-${y.slice(-2)}`;
}

// Readiness sort rank — lower sorts first. Default prioritizes "Ready" cases.
function readinessRank(r: Readiness | undefined): number {
  if (r === "ready") return 0;
  if (r === "not_ready") return 1;
  return 2; // Not assessed
}

export function PatientListTable({
  patients,
  readinessById,
}: {
  patients: PatientSummary[];
  readinessById: Record<string, Readiness | undefined>;
}) {
  // "asc" = Ready first (default); "desc" reverses.
  const [dir, setDir] = useState<"asc" | "desc">("asc");

  const sorted = useMemo(() => {
    const factor = dir === "asc" ? 1 : -1;
    // Stable sort keeps the incoming admit-date order as a tiebreaker.
    return [...patients].sort(
      (a, b) =>
        factor *
        (readinessRank(readinessById[a.id]) - readinessRank(readinessById[b.id])),
    );
  }, [patients, readinessById, dir]);

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-[880px] text-left text-sm">
        <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
          <tr>
            <th className="px-4 py-3 font-medium">Patient</th>
            <th className="px-4 py-3 font-medium">Location</th>
            <th className="px-4 py-3 font-medium">Reason for encounter</th>
            <th className="px-4 py-3 font-medium">Admit date</th>
            <th className="px-4 py-3 font-medium">LOS</th>
            <th className="px-4 py-3 font-medium">
              <button
                type="button"
                onClick={() => setDir((d) => (d === "asc" ? "desc" : "asc"))}
                className="inline-flex items-center gap-6 uppercase tracking-wide transition-colors hover:text-zinc-800 dark:hover:text-zinc-200"
                title="Sort by discharge readiness"
              >
                <span className="text-left">Discharge readiness</span>
                <span aria-hidden className="text-[10px]">
                  {dir === "asc" ? "▲" : "▼"}
                </span>
              </button>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {sorted.map((p) => (
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
              <td className="px-4 py-3 whitespace-nowrap text-zinc-700 dark:text-zinc-300">
                {p.location}
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
