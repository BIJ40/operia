/**
 * Edge Function tests for health-check endpoint.
 * 
 * Tests connectivity, response shape, and status codes.
 * Run via: supabase--test_edge_functions
 */

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") || Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/health-check`;

Deno.test("health-check: returns valid JSON with expected shape", async () => {
  const response = await fetch(FUNCTION_URL, {
    headers: {
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
  });

  const body = await response.json();

  // Should return one of: 200, 207, 503
  assertEquals([200, 207, 503].includes(response.status), true, `Unexpected status: ${response.status}`);

  // Shape validation
  assertExists(body.status, "Missing 'status' field");
  assertExists(body.timestamp, "Missing 'timestamp' field");
  assertExists(body.totalLatencyMs, "Missing 'totalLatencyMs' field");
  assertExists(body.checks, "Missing 'checks' array");

  assertEquals(["ok", "degraded", "down"].includes(body.status), true, `Invalid status: ${body.status}`);
  assertEquals(Array.isArray(body.checks), true, "'checks' should be an array");
  assertEquals(body.checks.length >= 2, true, "Should have at least 2 checks (database + auth)");
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
    assertEquals(typeof check.latencyMs, "number", `latencyMs should be number, got ${typeof check.latencyMs}`);
    assertEquals(["ok", "error"].includes(check.status), true, `Invalid check status: ${check.status}`);
  }
});

Deno.test("health-check: CORS preflight returns 200", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "OPTIONS",
    headers: {
      "Origin": "https://operiav2.lovable.app",
    },
  });

  await response.text(); // consume body
  assertEquals(response.status, 200, "OPTIONS should return 200");
});

Deno.test("health-check: status=ok implies HTTP 200", async () => {
  const response = await fetch(FUNCTION_URL, {
    headers: {
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
  });

  const body = await response.json();

  if (body.status === "ok") {
    assertEquals(response.status, 200, "status=ok should map to HTTP 200");
  } else if (body.status === "down") {
    assertEquals(response.status, 503, "status=down should map to HTTP 503");
  } else if (body.status === "degraded") {
    assertEquals(response.status, 207, "status=degraded should map to HTTP 207");
  }
});
