import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bundle the FHIR data file into the serverless functions that read it at
  // runtime (Vercel only ships traced files; a bare fs.readFile isn't traced).
  outputFileTracingIncludes: {
    "/": ["./data-src/synthetic-ambient-fhir-25.jsonl"],
    "/patients/[id]": ["./data-src/synthetic-ambient-fhir-25.jsonl"],
    "/api/discharge-context": ["./data-src/synthetic-ambient-fhir-25.jsonl"],
  },
};

export default nextConfig;
