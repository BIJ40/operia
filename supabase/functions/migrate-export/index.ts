import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const MIGRATION_SECRET = Deno.env.get('MIGRATION_SECRET') ?? '';

import { handleCorsPreflightOrReject, withCors } from '../_shared/cors.ts';

// jsonResponse is used inside the handler; CORS is applied via withCors wrapper at call sites
function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function listAllTables(admin: any): Promise<string[]> {
  // Essayer la RPC d'abord
  const { data, error } = await admin.rpc('list_public_tables');
  if (!error && data) {
    return (data as any[]).map((r: any) => r.tablename);
  }
  // Fallback: lire depuis le endpoint REST OpenAPI
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const res = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (res.ok) {
    const spec = await res.json();
    const paths = Object.keys(spec.paths || {});
    return paths.filter((p) => p.startsWith('/') && p !== '/').map((p) => p.slice(1)).filter((t) => !t.startsWith('rpc/'));
  }
  return [];
}

async function getFkDependencies(admin: any): Promise<{ child_table: string; parent_table: string; fk_column: string; ref_column: string }[]> {
  const { data, error } = await admin.rpc('get_fk_dependencies');
  if (!error && data) {
    return data as any[];
  }
  // Si la RPC n'existe pas, retourner vide (les tables seront importees dans l'ordre alphabetique)
  return [];
}

function topoSort(allTables: string[], deps: { child_table: string; parent_table: string }[]): string[] {
  const graph: Record<string, Set<string>> = {};
  for (const t of allTables) {
    graph[t] = new Set();
  }
  for (const dep of deps) {
    if (dep.child_table !== dep.parent_table && graph[dep.child_table]) {
      graph[dep.child_table].add(dep.parent_table);
    }
  }

  const sorted: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(node: string) {
    if (visited.has(node)) return;
    if (visiting.has(node)) {
      sorted.push(node);
      visited.add(node);
      return;
    }
    visiting.add(node);
    for (const dep of graph[node] ?? []) {
      visit(dep);
    }
    visiting.delete(node);
    visited.add(node);
    sorted.push(node);
  }

  for (const t of allTables) {
    visit(t);
  }
  return sorted;
}

// Simple IP-based rate limiting (in-memory, resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // max requests
const RATE_WINDOW_MS = 60_000; // per minute

function checkMigrateRateLimit(identifier: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

Deno.serve(async (req) => {
  const corsResult = handleCorsPreflightOrReject(req);
  if (corsResult) return corsResult;

  // Override jsonResponse locally to include CORS
  const respond = (data: unknown, status = 200) => withCors(req, jsonResponse(data, status));

  try {
    const url = new URL(req.url);

    // Authentication: X-Migration-Secret header ONLY (query param removed for security)
    const headerSecret = req.headers.get('X-Migration-Secret');

    if (!headerSecret || headerSecret !== MIGRATION_SECRET) {
      return respond({ error: 'Secret invalide' }, 403);
    }

    // Rate limiting by secret (single caller expected)
    const rateLimitKey = `migrate-export`;
    if (!checkMigrateRateLimit(rateLimitKey)) {
      return respond({ error: 'Trop de requêtes. Réessayez dans 1 minute.' }, 429);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey);

    const mode = url.searchParams.get('mode') || 'tables';

    // ============================================
    // MODE: Liste des tables + count exact + ordre d'import
    // GET with X-Migration-Secret header, ?mode=tables
    // ============================================
    if (mode === 'tables') {
      const tableNames = await listAllTables(admin);
      const fkDeps = await getFkDependencies(admin);
      const importOrder = topoSort(tableNames, fkDeps);

      const tableInfos: { name: string; count: number; import_position: number }[] = [];
      for (const name of tableNames) {
        try {
          const { count } = await admin.from(name).select('*', { count: 'exact', head: true });
          tableInfos.push({
            name,
            count: count ?? 0,
            import_position: importOrder.indexOf(name),
          });
        } catch {
          tableInfos.push({ name, count: -1, import_position: importOrder.indexOf(name) });
        }
      }

      const totalRows = tableInfos.reduce((sum, t) => sum + Math.max(t.count, 0), 0);

      return respond({
        mode: 'tables',
        tables: tableInfos.sort((a, b) => a.import_position - b.import_position),
        import_order: importOrder,
        total_tables: tableInfos.length,
        total_rows: totalRows,
        fk_dependencies: fkDeps,
      });
    }

    // ============================================
    // MODE: Export une table complete (toutes les pages)
    // GET with X-Migration-Secret header, ?mode=export&table=profiles
    // Pour les tres grosses tables, paginer:
    // ?mode=export&table=profiles&page=0&pageSize=500
    // ============================================
    if (mode === 'export') {
      const table = url.searchParams.get('table');
      if (!table) {
        return respond({ error: 'Parametre table requis' }, 400);
      }

      const pageParam = url.searchParams.get('page');

      // Si pas de page specifiee, exporter TOUTE la table
      if (pageParam === null) {
        const allRows: any[] = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await admin
            .from(table)
            .select('*')
            .range(page * pageSize, (page + 1) * pageSize - 1);

          if (error) {
            return respond({ error: error.message, table }, 400);
          }
          allRows.push(...(data ?? []));
          hasMore = (data?.length ?? 0) === pageSize;
          page++;
        }

        return respond({
          table,
          count: allRows.length,
          complete: true,
          data: allRows,
        });
      }

      // Mode pagine
      const page = Math.max(parseInt(pageParam, 10), 0);
      const pageSize = Math.min(Math.max(parseInt(url.searchParams.get('pageSize') ?? '500', 10), 1), 2000);
      const offset = page * pageSize;

      const { count: totalCount } = await admin.from(table).select('*', { count: 'exact', head: true });

      const { data, error } = await admin
        .from(table)
        .select('*')
        .range(offset, offset + pageSize - 1);

      if (error) {
        return respond({ error: error.message, table }, 400);
      }

      const rows = data ?? [];
      return respond({
        table,
        page,
        pageSize,
        count: rows.length,
        totalCount: totalCount ?? null,
        totalPages: totalCount ? Math.ceil(totalCount / pageSize) : null,
        hasMore: rows.length === pageSize,
        data: rows,
      });
    }

    // ============================================
    // MODE: Export auth.users
    // GET with X-Migration-Secret header, ?mode=auth_users
    // ============================================
    if (mode === 'auth_users') {
      const allUsers: any[] = [];
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const { data: { users }, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) {
          return respond({ error: error.message }, 500);
        }
        allUsers.push(...users);
        hasMore = users.length === 1000;
        page++;
      }

      return respond({
        mode: 'auth_users',
        count: allUsers.length,
        data: allUsers,
      });
    }

    // ============================================
    // MODE: Export storage buckets + signed URLs
    // GET with X-Migration-Secret header, ?mode=storage
    // ============================================
    if (mode === 'storage') {
      const { data: buckets, error } = await admin.storage.listBuckets();
      if (error) {
        return respond({ error: error.message }, 500);
      }

      const bucketsWithFiles: any[] = [];
      for (const bucket of buckets ?? []) {
        const allFiles: any[] = [];

        async function listRecursive(prefix: string) {
          const { data: items } = await admin.storage.from(bucket.name).list(prefix, {
            limit: 10000,
            sortBy: { column: 'name', order: 'asc' },
          });
          for (const item of items ?? []) {
            const path = prefix ? `${prefix}/${item.name}` : item.name;
            if (item.id) {
              // C'est un fichier
              const { data: urlData } = await admin.storage.from(bucket.name).createSignedUrl(path, 3600);
              allFiles.push({
                ...item,
                path,
                signedUrl: urlData?.signedUrl ?? null,
              });
            } else {
              // C'est un dossier
              await listRecursive(path);
            }
          }
        }

        await listRecursive('');

        bucketsWithFiles.push({
          id: bucket.id,
          name: bucket.name,
          public: bucket.public,
          file_size_limit: bucket.file_size_limit,
          allowed_mime_types: bucket.allowed_mime_types,
          files: allFiles,
          fileCount: allFiles.length,
        });
      }

      return respond({
        mode: 'storage',
        buckets: bucketsWithFiles,
        total_buckets: bucketsWithFiles.length,
        total_files: bucketsWithFiles.reduce((s, b) => s + b.fileCount, 0),
      });
    }

    return respond({
      error: 'Mode invalide',
      modes: {
        tables: 'Liste tables + counts + ordre import FK',
        export: 'Export une table (?table=X, optionnel: &page=0&pageSize=500)',
        auth_users: 'Export tous les auth.users',
        storage: 'Export buckets + fichiers avec signed URLs (1h)',
      },
    }, 400);

  } catch (err) {
    return respond({ error: String(err) }, 500);
  }
});
