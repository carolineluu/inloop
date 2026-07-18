"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// Fires discharge-context generation for a set of records (the admissions),
// then refreshes the server list so the readiness badges light up. Runs
// sequentially to stay gentle on rate limits.
export function AssessAllButton({ ids }: { ids: string[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setError(null);
    setDone(0);
    try {
      for (const id of ids) {
        const res = await fetch("/api/discharge-context", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Request failed (${res.status})`);
        }
        setDone((d) => d + 1);
      }
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Assessment failed.");
    } finally {
      setRunning(false);
    }
  }

  const busy = running || isPending;

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={run}
        disabled={busy || ids.length === 0}
        className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy
          ? `Assessing… ${done}/${ids.length}`
          : `Assess ${ids.length} admissions`}
      </button>
      {error && (
        <span className="text-xs text-rose-600 dark:text-rose-400">{error}</span>
      )}
    </div>
  );
}
