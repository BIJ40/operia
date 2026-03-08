/**
 * Integration tests for media-get-signed-url Edge Function
 * Tests: token validation, origin enforcement
 */
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/media-get-signed-url`;

Deno.test("media-get-signed-url: rejects unauthenticated", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: "test/file.pdf", bucket: "documents" }),
  });
  const body = await response.text();
  assertEquals(response.status >= 400 && response.status < 500, true, `Expected 4xx: ${body}`);
});

Deno.test("media-get-signed-url: rejects missing path", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({}),
  });
  const body = await response.text();
  assertEquals(response.status >= 400, true, `Expected error for missing path: ${body}`);
});

Deno.test("media-get-signed-url: CORS preflight works", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "OPTIONS",
    headers: { "Origin": "https://operiav2.lovable.app" },
  });
  await response.text();
  assertEquals(response.status, 200);
  assertExists(response.headers.get("access-control-allow-origin"));
});

Deno.test("media-get-signed-url: rejects unauthorized origin", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "OPTIONS",
    headers: { "Origin": "https://evil-site.com" },
  });
  await response.text();
  const origin = response.headers.get("access-control-allow-origin");
  // Should NOT return evil-site.com as allowed origin
  if (origin) {
    assertEquals(origin.includes("evil-site.com"), false);
  }
});
