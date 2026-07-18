import "server-only";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import type { DischargeContext } from "./types";

// Disk-backed cache of generated discharge context, keyed by record id. Shared
// between the API route (which writes it) and the patient list (which reads it
// to show a readiness badge). Persisting to disk means assessments survive dev
// recompiles and restarts. Reads/writes hit the file every time (no in-memory
// memoization) so the list and the API route — which run as separate server
// module instances in dev — always see the same, current data.
const FILE = path.join(process.cwd(), ".discharge-cache", "contexts.json");

function readAll(): Record<string, DischargeContext> {
  try {
    if (existsSync(FILE)) {
      return JSON.parse(readFileSync(FILE, "utf8")) as Record<
        string,
        DischargeContext
      >;
    }
  } catch {
    // Corrupt/missing cache file is non-fatal — treat as empty.
  }
  return {};
}

export function getCachedContext(id: string): DischargeContext | undefined {
  return readAll()[id];
}

export function setCachedContext(id: string, ctx: DischargeContext): void {
  const all = readAll();
  all[id] = ctx;
  try {
    mkdirSync(path.dirname(FILE), { recursive: true });
    writeFileSync(FILE, JSON.stringify(all));
  } catch {
    // Best-effort persistence; ignore write failures.
  }
}

export function hasCachedContext(id: string): boolean {
  return id in readAll();
}
