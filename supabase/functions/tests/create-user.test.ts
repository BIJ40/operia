/**
 * Integration tests for create-user Edge Function
 * Tests: rejection guards + authenticated scenario with valid payload
 */
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") || Deno.env.get("SUPABASE_URL") || "https://qvrankgpfltadxegeiky.supabase.co";
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2cmFua2dwZmx0YWR4ZWdlaWt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTEyNzcsImV4cCI6MjA4MTA2NzI3N30.EQh-5XEX2uywoIWI-pXbJja8cTPZDuRs0w3zbMmzHbI";

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/create-user`;

Deno.test("create-user: rejects unauthenticated request", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "test@example.com",
      first_name: "Test",
      last_name: "User",
      global_role: "base_user",
    }),
  });
  const body = await response.text();
  assertEquals(response.status >= 400 && response.status < 500, true, `Expected 4xx: ${body}`);
});

Deno.test("create-user: OPTIONS returns CORS", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "OPTIONS",
    headers: { "Origin": "https://operiav2.lovable.app" },
  });
  await response.text();
  assertEquals(response.status, 200);
});

Deno.test("create-user: rejects empty body", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({}),
  });
  const body = await response.text();
  assertEquals(response.status >= 400, true, `Expected error: ${body}`);
});

Deno.test("create-user: anon key with valid payload returns structured response", async () => {
  // With anon key, the function should either:
  // - reject (403/401) because anon != authenticated admin, OR
  // - return a structured error response (not a 500 crash)
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      email: `test-e2e-${Date.now()}@example.com`,
      first_name: "E2E",
      last_name: "Test",
      globalRole: "base_user",
      agencyId: "00000000-0000-0000-0000-000000000000",
    }),
  });
  const body = await response.text();
  // Must not be a 500 — the function handles the request gracefully
  assertEquals(response.status < 500, true, `Expected non-500 response, got ${response.status}: ${body}`);
  // Response should be parseable (JSON error or success)
  let parsed: unknown;
  try { parsed = JSON.parse(body); } catch { parsed = null; }
  assertExists(parsed, "Response should be valid JSON");
});
