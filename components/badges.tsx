import type { Setting, Readiness } from "@/lib/types";

const SETTING_STYLES: Record<Setting, string> = {
  Inpatient:
    "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-400/20",
  SNF: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-400/20",
  Hospice:
    "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-400/20",
  Outpatient:
    "bg-zinc-100 text-zinc-600 ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-400/20",
};

export function SettingBadge({ setting }: { setting: Setting }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${SETTING_STYLES[setting]}`}
    >
      {setting}
    </span>
  );
}

const READINESS: Record<Readiness, { label: string; className: string }> = {
  ready: {
    label: "Ready",
    className:
      "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-400/20",
  },
  not_ready: {
    label: "Not ready",
    className:
      "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-400/20",
  },
};

export function ReadinessBadge({
  readiness,
}: {
  readiness: Readiness | null | undefined;
}) {
  if (!readiness) {
    return (
      <span className="inline-flex items-center rounded-full bg-zinc-50 px-2 py-0.5 text-xs font-medium text-zinc-400 ring-1 ring-inset ring-zinc-300/60 dark:bg-zinc-900 dark:text-zinc-500 dark:ring-zinc-700">
        Not assessed
      </span>
    );
  }
  const r = READINESS[readiness];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${r.className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {r.label}
    </span>
  );
}

const INDICATOR_DOT: Record<"met" | "improving" | "not_met", string> = {
  met: "bg-emerald-500",
  improving: "bg-amber-500",
  not_met: "bg-rose-500",
};

export function IndicatorDot({
  status,
}: {
  status: "met" | "improving" | "not_met";
}) {
  return (
    <span
      className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${INDICATOR_DOT[status]}`}
      aria-label={status}
    />
  );
}
