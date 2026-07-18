import "server-only";
import type { DischargeContext } from "./types";

// Session-lifetime in-memory cache of generated discharge context, keyed by
// record id. Shared between the API route (which writes it) and the patient
// list (which reads it to show a readiness badge for already-assessed patients).
// Not persisted — a server restart clears it.
const cache = new Map<string, DischargeContext>();

export function getCachedContext(id: string): DischargeContext | undefined {
  return cache.get(id);
}

export function setCachedContext(id: string, ctx: DischargeContext): void {
  cache.set(id, ctx);
}

export function hasCachedContext(id: string): boolean {
  return cache.has(id);
}
