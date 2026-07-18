"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { DischargeContext, DoctorTodo } from "@/lib/types";
import { ReadinessBadge, IndicatorDot } from "./badges";

// Sort indicators worst-first: red (not_met) → amber (improving) → green (met).
const INDICATOR_ORDER: Record<"met" | "improving" | "not_met", number> = {
  not_met: 0,
  improving: 1,
  met: 2,
};

const TODO_LABEL: Record<DoctorTodo["type"], string> = {
  order: "Order",
  documentation: "Documentation",
  consult: "Consult",
  follow_up: "Follow-up",
};

function TodoTag({ type }: { type: DoctorTodo["type"] }) {
  const isOrder = type === "order";
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
        isOrder
          ? "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300"
          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
      }`}
    >
      {TODO_LABEL[type]}
    </span>
  );
}

export function DischargeContextPanel({ id }: { id: string }) {
  const router = useRouter();
  const [data, setData] = useState<DischargeContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (refresh = false) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/discharge-context", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, refresh }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
        setData(body as DischargeContext);
        // Refresh the server list so its readiness badge stays in sync.
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to generate.");
      } finally {
        setLoading(false);
      }
    },
    [id, router],
  );

  useEffect(() => {
    generate(false);
  }, [generate]);

  return (
    <section className="p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-sky-800 dark:text-sky-300">
            Discharge Planning
          </h2>
          {data && <ReadinessBadge readiness={data.readiness} />}
        </div>
        {loading && (
          <span className="text-xs font-medium text-sky-700 dark:text-sky-300">
            Generating…
          </span>
        )}
      </div>

      {loading && !data && (
        <p className="text-sm text-sky-700/80 dark:text-sky-300/80">
          Claude is reading the note, problems, vitals and labs…
        </p>
      )}

      {error && (
        <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
      )}

      {data && (
        <div className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Suggested disposition
            </p>
            <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-200">
              {data.suggestedDisposition}
            </p>
          </div>

          <Block title="Clinical Milestones">
            <ul className="space-y-2">
              {[...data.readinessIndicators]
                .sort(
                  (a, b) =>
                    INDICATOR_ORDER[a.status] - INDICATOR_ORDER[b.status],
                )
                .map((ind, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <IndicatorDot status={ind.status} />
                  <span>
                    <span className="font-medium text-zinc-800 dark:text-zinc-100">
                      {ind.indicator}
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400">
                      {" "}
                      — {ind.evidence}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </Block>

          <Block title="Next steps">
            <ul className="space-y-2">
              {data.doctorTodos
                .filter((t) => t.type !== "documentation")
                .map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <TodoTag type={t.type} />
                    <span>
                      <span className="font-medium text-zinc-800 dark:text-zinc-100">
                        {t.task}
                      </span>
                      {/* Orders show only the order-set name; other types keep detail. */}
                      {t.type !== "order" && t.detail && (
                        <span className="text-zinc-500 dark:text-zinc-400">
                          {" "}
                          — {t.detail}
                        </span>
                      )}
                      {t.priority && (
                        <span className="ml-1 text-[11px] uppercase text-zinc-400">
                          [{t.priority}]
                        </span>
                      )}
                    </span>
                  </li>
                ))}
            </ul>
          </Block>

          {data.barriers.length > 0 && (
            <Block title="Barriers">
              <ul className="space-y-2">
                {data.barriers.map((b, i) => (
                  <li key={i} className="text-sm">
                    <span className="font-medium text-zinc-800 dark:text-zinc-100">
                      {b.item}
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400">
                      {" "}
                      — {b.detail}
                    </span>
                  </li>
                ))}
              </ul>
            </Block>
          )}
        </div>
      )}
    </section>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {title}
      </h3>
      {children}
    </div>
  );
}
