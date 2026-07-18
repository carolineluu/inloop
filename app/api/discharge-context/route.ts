import { NextResponse } from "next/server";
import { getPatient } from "@/lib/data";
import { generateDischargeContext } from "@/lib/anthropic";
import { getCachedContext, setCachedContext } from "@/lib/context-cache";
import { getDummyContext } from "@/lib/dummy";

export async function POST(request: Request) {
  let body: { id?: string; patientId?: string; refresh?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const id = body.id ?? body.patientId;
  const { refresh } = body;
  if (!id) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  // Dummy patients carry a fixed, pre-built context — no model call.
  const dummy = getDummyContext(id);
  if (dummy) return NextResponse.json(dummy);

  const patient = await getPatient(id);
  if (!patient) {
    return NextResponse.json({ error: "Patient not found." }, { status: 404 });
  }

  if (!refresh) {
    const cached = getCachedContext(id);
    if (cached) return NextResponse.json(cached);
  }

  try {
    const context = await generateDischargeContext(patient);
    setCachedContext(id, context);
    return NextResponse.json(context);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate discharge context.";
    console.error("discharge-context error:", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
