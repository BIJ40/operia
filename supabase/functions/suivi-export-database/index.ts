import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-export-key',
};

const EXPORT_SECRET = Deno.env.get('EXPORT_SECRET_KEY');

// Tables à exporter (ajouter/retirer selon besoin)
const TABLES_TO_EXPORT = ['agencies', 'payments', 'sms_sent_log'];

// Tables système à ignorer pour l'export de données
const SYSTEM_SCHEMAS = ['pg_catalog', 'information_schema', 'auth', 'storage', 'extensions', 'graphql', 'graphql_public', 'realtime', 'supabase_functions', 'supabase_migrations', 'vault', 'pgsodium'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Vérification du mot de passe
    const exportKey = req.headers.get('x-export-key');
    if (!EXPORT_SECRET || !exportKey || exportKey !== EXPORT_SECRET) {
      return new Response(
        JSON.stringify({ error: 'UNAUTHORIZED', message: 'Clé d\'export invalide' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { tables, includeSchema = true, includeData = true, includeMigrations = true } = body as {
      tables?: string[];
      includeSchema?: boolean;
      includeData?: boolean;
      includeMigrations?: boolean;
    };

    const tablesToExport = tables && tables.length > 0 ? tables : TABLES_TO_EXPORT;

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const result: Record<string, any> = {
      exported_at: new Date().toISOString(),
      source_project: Deno.env.get('SUPABASE_URL'),
    };

    // 1. Export du schéma (structure des tables)
    if (includeSchema) {
      const { data: schemaData, error: schemaError } = await supabaseAdmin.rpc('export_schema_info');

      if (schemaError) {
        // Fallback: requête directe sur information_schema
        const { data: columns, error: colError } = await supabaseAdmin
          .from('information_schema.columns' as any)
          .select('*')
          .not('table_schema', 'in', `(${SYSTEM_SCHEMAS.join(',')})`)
          .in('table_name', tablesToExport);

        if (colError) {
          // Second fallback via SQL brut
          const schema = await getSchemaViaSQL(supabaseAdmin, tablesToExport);
          result.schema = schema;
        } else {
          result.schema = columns;
        }
      } else {
        result.schema = schemaData;
      }
    }

    // 2. Export des données
    if (includeData) {
      const tablesData: Record<string, any> = {};

      for (const table of tablesToExport) {
        const { data, error } = await supabaseAdmin
          .from(table)
          .select('*');

        if (error) {
          tablesData[table] = { error: error.message };
        } else {
          tablesData[table] = {
            count: data?.length ?? 0,
            rows: data ?? [],
          };
        }
      }

      result.data = tablesData;
    }

    // 3. Export des migrations (liste ordonnée)
    if (includeMigrations) {
      const { data: migrations, error: migError } = await supabaseAdmin
        .from('supabase_migrations.schema_migrations' as any)
        .select('*')
        .order('version', { ascending: true });

      if (migError) {
        // Fallback: récupérer depuis la table directement via SQL
        const migrations = await getMigrationsViaSQL(supabaseAdmin);
        result.migrations = migrations;
      } else {
        result.migrations = migrations;
      }
    }

    // 4. Export des RLS policies
    const policies = await getRLSPolicies(supabaseAdmin);
    if (policies) {
      result.rls_policies = policies;
    }

    // 5. Export des fonctions SQL custom
    const functions = await getCustomFunctions(supabaseAdmin);
    if (functions) {
      result.functions = functions;
    }

    return new Response(
      JSON.stringify(result, null, 2),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (err) {
    console.error('Export error:', err);
    return new Response(
      JSON.stringify({ error: 'EXPORT_FAILED', message: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getSchemaViaSQL(supabase: any, tables: string[]) {
  const tableList = tables.map(t => `'${t}'`).join(',');

  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT
        t.table_name,
        json_agg(json_build_object(
          'column_name', c.column_name,
          'data_type', c.data_type,
          'udt_name', c.udt_name,
          'is_nullable', c.is_nullable,
          'column_default', c.column_default,
          'character_maximum_length', c.character_maximum_length
        ) ORDER BY c.ordinal_position) as columns,
        (SELECT json_agg(json_build_object(
          'constraint_name', tc.constraint_name,
          'constraint_type', tc.constraint_type,
          'column_name', kcu.column_name
        ))
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = t.table_name
          AND tc.table_schema = 'public'
        ) as constraints
      FROM information_schema.tables t
      JOIN information_schema.columns c
        ON t.table_name = c.table_name AND t.table_schema = c.table_schema
      WHERE t.table_schema = 'public'
        AND t.table_name IN (${tableList})
      GROUP BY t.table_name
    `
  });

  return error ? { error: error.message } : data;
}

async function getMigrationsViaSQL(supabase: any) {
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `SELECT version, name, statements FROM supabase_migrations.schema_migrations ORDER BY version ASC`
  });
  return error ? { error: error.message, note: 'Migrations disponibles dans le dossier supabase/migrations/' } : data;
}

async function getRLSPolicies(supabase: any) {
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname
    `
  });
  return error ? null : data;
}

async function getCustomFunctions(supabase: any) {
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT
        routine_name,
        routine_type,
        data_type as return_type,
        routine_definition
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      ORDER BY routine_name
    `
  });
  return error ? null : data;
}
