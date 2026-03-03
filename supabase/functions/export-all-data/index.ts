import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { handleCorsPreflightOrReject, withCors } from '../_shared/cors.ts';

const HEAVY_TABLES = ['blocks', 'apporteur_blocks', 'guide_chunks', 'chatbot_queries', 'operia_blocks', 'rag_index_documents', 'knowledge_base', 'apogee_guides', 'apogee_tickets', 'activity_log'];

Deno.serve(async (req) => {
  const corsResponse = handleCorsPreflightOrReject(req);
  if (corsResponse) return corsResponse;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return withCors(req, new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401, headers: { 'Content-Type': 'application/json' } }));
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseService = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const anonClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (claimsError || !claimsData?.claims?.sub) {
      return withCors(req, new Response(JSON.stringify({ error: 'Token invalide' }), { status: 401, headers: { 'Content-Type': 'application/json' } }));
    }

    const serviceClient = createClient(supabaseUrl, supabaseService);
    const { data: profile } = await serviceClient.from('profiles').select('global_role').eq('id', claimsData.claims.sub).single();
    const level = { superadmin: 6, platform_admin: 5 }[profile?.global_role as string] ?? 0;
    if (level < 5) {
      return withCors(req, new Response(JSON.stringify({ error: 'Accès réservé N5+' }), { status: 403, headers: { 'Content-Type': 'application/json' } }));
    }

    // Fetch all public tables dynamically via RPC
    const { data: tableRows, error: tableError } = await serviceClient.rpc('list_public_tables');
    if (tableError || !tableRows) {
      return withCors(req, new Response(JSON.stringify({ error: 'Impossible de lister les tables: ' + (tableError?.message ?? 'unknown') }), { status: 500, headers: { 'Content-Type': 'application/json' } }));
    }
    const allTables: string[] = (tableRows as any[]).map((r: any) => r.tablename);

    const url = new URL(req.url);
    const tableParam = url.searchParams.get('table');
    const countOnly = url.searchParams.get('countOnly');

    // Mode 1: List all tables
    if (!tableParam && !countOnly) {
      return withCors(req, new Response(JSON.stringify({ tables: allTables.map(name => ({ name })), total: allTables.length }), {
        headers: { 'Content-Type': 'application/json' },
      }));
    }

    // Mode 2: Count rows for a batch of tables
    if (countOnly) {
      const tableNames = countOnly.split(',').filter(t => allTables.includes(t)).slice(0, 20);
      const results: { name: string; count: number }[] = [];
      for (const name of tableNames) {
        try {
          const { count } = await serviceClient.from(name).select('*', { count: 'exact', head: true });
          results.push({ name, count: count ?? 0 });
        } catch {
          results.push({ name, count: -1 });
        }
      }
      return withCors(req, new Response(JSON.stringify({ tables: results }), {
        headers: { 'Content-Type': 'application/json' },
      }));
    }

    // Mode 3: Export a specific table page
    if (!allTables.includes(tableParam)) {
      return withCors(req, new Response(JSON.stringify({ error: `Table "${tableParam}" non autorisée` }), { status: 400, headers: { 'Content-Type': 'application/json' } }));
    }

    const page = parseInt(url.searchParams.get('page') ?? '0', 10);
    if (!Number.isInteger(page) || page < 0) {
      return withCors(req, new Response(JSON.stringify({ error: 'Paramètre page invalide' }), { status: 400, headers: { 'Content-Type': 'application/json' } }));
    }

    const isHeavyTable = HEAVY_TABLES.includes(tableParam);
    const defaultPageSize = isHeavyTable ? 25 : 100;
    const requestedPageSize = parseInt(url.searchParams.get('pageSize') ?? String(defaultPageSize), 10);
    const maxPageSize = isHeavyTable ? 50 : 200;
    const PAGE_SIZE = Math.min(Math.max(Number.isFinite(requestedPageSize) ? requestedPageSize : defaultPageSize, 10), maxPageSize);
    const offset = page * PAGE_SIZE;

    const { data, error } = await serviceClient
      .from(tableParam)
      .select('*')
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      return withCors(req, new Response(JSON.stringify({ error: error.message, table: tableParam }), { status: 400, headers: { 'Content-Type': 'application/json' } }));
    }

    const rows = data ?? [];
    return withCors(req, new Response(JSON.stringify({ table: tableParam, page, pageSize: PAGE_SIZE, count: rows.length, hasMore: rows.length === PAGE_SIZE, data: rows }), {
      headers: { 'Content-Type': 'application/json' },
    }));

  } catch (err) {
    return withCors(req, new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } }));
  }
});
