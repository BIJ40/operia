import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(() => {
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "NOT FOUND";
  return new Response(key, {
    headers: {
      "Content-Type": "text/plain"
    }
  });
});
