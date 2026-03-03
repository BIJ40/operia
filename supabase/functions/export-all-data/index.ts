import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Use service role to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request
    const { table, secret } = await req.json();

    // Simple secret protection
    if (secret !== 'export-lovable-2026-temp') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If no table specified, list all tables with row counts
    if (!table) {
      const { data, error } = await supabase.rpc('exec_sql', {
        query: `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
      }).throwOnError();

      // For each table, get count
      const tables: { name: string; count: number }[] = [];
      const tableList = Array.isArray(data) ? data : [];

      for (const t of tableList) {
        const name = t.tablename || t;
        try {
          const { count } = await supabase.from(name).select('*', { count: 'exact', head: true });
          tables.push({ name, count: count || 0 });
        } catch {
          tables.push({ name, count: -1 });
        }
      }

      return new Response(JSON.stringify({ tables }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Export specific table (paginated)
    const pageSize = 1000;
    let allData: unknown[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .range(offset, offset + pageSize - 1);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (data && data.length > 0) {
        allData = allData.concat(data);
        offset += pageSize;
        hasMore = data.length === pageSize;
      } else {
        hasMore = false;
      }
    }

    return new Response(JSON.stringify({ table, count: allData.length, data: allData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
