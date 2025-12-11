import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(() => {
  const url = Deno.env.get("SUPABASE_URL") ?? "NOT FOUND";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "NOT FOUND";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "NOT FOUND";

  return new Response(
    JSON.stringify({
      SUPABASE_URL: url,
      SUPABASE_ANON_KEY: anon,
      SUPABASE_SERVICE_ROLE_KEY: service
    }, null, 2),
    {
      headers: { "Content-Type": "application/json" }
    }
  );
});
