/**
 * Edge Function tests for health-check endpoint.
 * Run via: supabase--test_edge_functions
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

// Public project URL and anon key (non-secret, safe to include)
const SUPABASE_URL = "https://qvrankgpfltadxegeiky.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2cmFua2dwZmx0YWR4ZWdlaWt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTEyNzcsImV4cCI6MjA4MTA2NzI3N30.EQh-5XEX2uywoIWI-pXbJja8cTPZDuRs0w3zbMmzHbI";
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/health-check`;

Deno.test("health-check: returns valid JSON with expected shape", async () => {
  const response = await fetch(FUNCTION_URL, {
    headers: {
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
  });

  const body = await response.json();

  assertEquals([200, 207, 503].includes(response.status), true, `Unexpected status: ${response.status}`);
  assertExists(body.status, "Missing 'status' field");
  assertExists(body.timestamp, "Missing 'timestamp' field");
  assertExists(body.totalLatencyMs, "Missing 'totalLatencyMs' field");
  assertExists(body.checks, "Missing 'checks' array");
  assertEquals(["ok", "degraded", "down"].includes(body.status), true, `Invalid status: ${body.status}`);
  assertEquals(Array.isArray(body.checks), true, "'checks' should be an array");
  assertEquals(body.checks.length >= 2, true, "Should have at least 2 checks");
});

Deno.test("health-check: each check has name, status, latencyMs", async () => {
  const response = await fetch(FUNCTION_URL, {
    headers: {
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
  });

  const body = await response.json();

  for (const check of body.checks) {
    assertExists(check.name, "Check missing 'name'");
    assertExists(check.status, "Check missing 'status'");
    assertEquals(typeof check.latencyMs, "number", `latencyMs should be number`);
    assertEquals(["ok", "error"].includes(check.status), true, `Invalid check status: ${check.status}`);
  }
});

Deno.test("health-check: CORS preflight returns 200", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "OPTIONS",
    headers: { "Origin": "https://operiav2.lovable.app" },
  });
  await response.text();
  assertEquals(response.status, 200, "OPTIONS should return 200");
});

Deno.test("health-check: status maps to correct HTTP code", async () => {
  const response = await fetch(FUNCTION_URL, {
    headers: {
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
  });

  const body = await response.json();

  if (body.status === "ok") assertEquals(response.status, 200);
  else if (body.status === "down") assertEquals(response.status, 503);
  else if (body.status === "degraded") assertEquals(response.status, 207);
});
