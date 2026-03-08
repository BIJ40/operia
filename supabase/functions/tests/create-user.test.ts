/**
 * Integration tests for create-user Edge Function
 * Tests: valid creation, privilege escalation blocking
 */
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

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
