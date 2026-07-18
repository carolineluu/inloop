import type { PatientChart as Chart } from "@/lib/types";
import { SettingBadge } from "./badges";
import React from "react";

function fmtDate(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Render **bold** spans and paragraphs from the SOAP note. Builds React nodes
 *  (no dangerouslySetInnerHTML), so there is no HTML-injection surface. */
function NoteMarkdown({ text }: { text: string }) {
  const paragraphs = text.split(/\n{2,}/);
  return (
    <div className="space-y-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
      {paragraphs.map((para, pi) => (
        <p key={pi} className="whitespace-pre-wrap">
          {para.split(/(\*\*[^*]+\*\*)/g).map((seg, si) =>
            seg.startsWith("**") && seg.endsWith("**") ? (
              <strong key={si} className="font-semibold text-zinc-900 dark:text-zinc-100">
                {seg.slice(2, -2)}
              </strong>
            ) : (
              <React.Fragment key={si}>{seg}</React.Fragment>
            ),
          )}
        </p>
      ))}
    </div>
  );
}

function Card({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950 ${className}`}
    >
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Empty() {
  return <p className="text-sm text-zinc-400 dark:text-zinc-500">None recorded.</p>;
}

export function PatientChart({ chart }: { chart: Chart }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {chart.name}
            </h1>
            <SettingBadge setting={chart.setting} />
          </div>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {chart.age} · {chart.sex}
            {chart.maritalStatus ? ` · ${chart.maritalStatus}` : ""} ·{" "}
            <span className="font-mono">{chart.mrn}</span>
          </p>
        </div>
        <div className="text-right text-sm text-zinc-500 dark:text-zinc-400">
          <div className="font-medium text-zinc-700 dark:text-zinc-200">
            {chart.visitTitle}
          </div>
          <div>
            Admitted {fmtDate(chart.admitDate)}
            {chart.lengthOfStayDays != null ? ` · LOS ${chart.lengthOfStayDays}d` : ""}
            {" · "}
            {chart.status}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Encounter reason">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            {chart.encounterReason}
          </p>
          {chart.encounterConditions.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
              {chart.encounterConditions.map((c, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span>{c.name}</span>
                  {c.status && (
                    <span className="text-xs text-zinc-400">{c.status}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Active problems (chart)">
          {chart.longitudinalConditions.length ? (
            <ul className="flex flex-wrap gap-1.5">
              {chart.longitudinalConditions.map((c, i) => (
                <li
                  key={i}
                  className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  {c}
                </li>
              ))}
            </ul>
          ) : (
            <Empty />
          )}
        </Card>

        <Card title="Vitals (most recent)">
          {chart.vitals.length ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              {chart.vitals.map((v, i) => (
                <div key={i} className="flex justify-between gap-2">
                  <dt className="text-zinc-500 dark:text-zinc-400">{v.name}</dt>
                  <dd className="font-medium text-zinc-800 dark:text-zinc-200">
                    {v.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <Empty />
          )}
        </Card>

        <Card title="Labs (most recent)">
          {chart.labs.length ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              {chart.labs.map((l, i) => (
                <div key={i} className="flex justify-between gap-2">
                  <dt className="text-zinc-500 dark:text-zinc-400">{l.name}</dt>
                  <dd className="font-medium text-zinc-800 dark:text-zinc-200">
                    {l.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <Empty />
          )}
        </Card>

        <Card title={chart.medications.length ? "Medications (this encounter)" : "Medications (home / active)"}>
          {chart.medications.length ? (
            <ul className="space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
              {chart.medications.map((m, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span>{m.name}</span>
                  {m.status && (
                    <span className="text-xs text-zinc-400">{m.status}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : chart.longitudinalMedications.length ? (
            // This dataset references encounter meds by id rather than inline,
            // so fall back to the patient's active medication list.
            <ul className="space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
              {chart.longitudinalMedications.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          ) : (
            <Empty />
          )}
        </Card>

        <Card title="Diagnostic reports">
          {chart.diagnosticReports.length ? (
            <ul className="space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
              {chart.diagnosticReports.map((d, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span>{d.name}</span>
                  <span className="text-xs text-zinc-400">{fmtDate(d.date)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty />
          )}
        </Card>
      </div>

      <Card title="Clinical note">
        <NoteMarkdown text={chart.note} />
      </Card>

      {chart.afterVisitSummary && (
        <Card title="After-visit summary">
          <NoteMarkdown text={chart.afterVisitSummary} />
        </Card>
      )}

      {chart.transcript && (
        <details className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Ambient transcript
          </summary>
          <pre className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {chart.transcript}
          </pre>
        </details>
      )}
    </div>
  );
}
