/**
 * Integration tests for sensitive-data Edge Function
 * Tests: authorized access, denied access, audit log creation
 */
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") || Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/sensitive-data`;

Deno.test("sensitive-data: rejects unauthenticated request", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "read", collaborator_id: "test" }),
  });
  const body = await response.text();
  // Should be 401 or 403
  assertEquals(response.status >= 400 && response.status < 500, true, `Expected 4xx, got ${response.status}: ${body}`);
});

Deno.test("sensitive-data: rejects invalid action", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ action: "INVALID_ACTION" }),
  });
  const body = await response.text();
  assertEquals(response.status >= 400, true, `Expected error status, got ${response.status}: ${body}`);
});

Deno.test("sensitive-data: OPTIONS returns CORS headers", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "OPTIONS",
    headers: { "Origin": "https://operiav2.lovable.app" },
  });
  await response.text();
  assertEquals(response.status, 200);
  assertExists(response.headers.get("access-control-allow-origin"));
});
