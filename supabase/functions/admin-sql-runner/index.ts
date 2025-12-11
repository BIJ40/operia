// admin-sql-runner/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const client = createClient(supabaseUrl, serviceRole);

  // La requête SQL à exécuter
  const sql = `
    create or replace function list_tables()
    returns text[]
    language plpgsql
    as $$
    declare
      result text[];
    begin
      select array_agg(tablename)
      into result
      from pg_tables
      where schemaname = 'public';
      return result;
    end;
    $$;
  `;

  const { error } = await client.rpc("exec_sql", { sql });

  if (error) {
    return new Response(JSON.stringify({ success: false, error }), {
      status: 400,
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
