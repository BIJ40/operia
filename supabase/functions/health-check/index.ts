/**
 * HEALTH CHECK ENDPOINT
 * 
 * Vérifie la connectivité DB + auth service.
 * Utilisable par un monitoring externe (UptimeRobot, etc.)
 * 
 * GET /functions/v1/health-check
 * Returns: { status: "ok" | "degraded" | "down", checks: {...}, timestamp }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthCheck {
  name: string;
  status: 'ok' | 'error';
  latencyMs: number;
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const checks: HealthCheck[] = [];
  const startTotal = performance.now();

  // 1. Database connectivity
  try {
    const start = performance.now();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase.from('profiles').select('id').limit(1);
    const latency = performance.now() - start;

    checks.push({
      name: 'database',
      status: error ? 'error' : 'ok',
      latencyMs: Math.round(latency),
      ...(error && { error: error.message }),
    });
  } catch (err) {
    checks.push({
      name: 'database',
      status: 'error',
      latencyMs: 0,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 2. Auth service
  try {
    const start = performance.now();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: { 'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! },
    });
    const latency = performance.now() - start;

    checks.push({
      name: 'auth',
      status: response.ok ? 'ok' : 'error',
      latencyMs: Math.round(latency),
      ...(!response.ok && { error: `HTTP ${response.status}` }),
    });
  } catch (err) {
    checks.push({
      name: 'auth',
      status: 'error',
      latencyMs: 0,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 3. Storage service
  try {
    const start = performance.now();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const response = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      headers: { 
        'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!}`,
      },
    });
    const latency = performance.now() - start;

    checks.push({
      name: 'storage',
      status: response.ok ? 'ok' : 'error',
      latencyMs: Math.round(latency),
      ...(!response.ok && { error: `HTTP ${response.status}` }),
    });
  } catch (err) {
    checks.push({
      name: 'storage',
      status: 'error',
      latencyMs: 0,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const totalLatency = Math.round(performance.now() - startTotal);
  const allOk = checks.every(c => c.status === 'ok');
  const allDown = checks.every(c => c.status === 'error');

  const overallStatus = allOk ? 'ok' : allDown ? 'down' : 'degraded';
  const httpStatus = allOk ? 200 : allDown ? 503 : 207;

  return new Response(
    JSON.stringify({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      totalLatencyMs: totalLatency,
      checks,
    }),
    {
      status: httpStatus,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
});
