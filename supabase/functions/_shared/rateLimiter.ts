/**
 * Rate limiter for Edge Functions using Supabase rate_limits table.
 * Prevents brute-force attacks on sensitive endpoints.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface RateLimitConfig {
  /** Max attempts allowed in the window */
  maxAttempts: number;
  /** Window duration in seconds */
  windowSeconds: number;
  /** Identifier prefix (e.g., 'create-user', 'reset-password') */
  action: string;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxAttempts: 10,
  windowSeconds: 300, // 5 minutes
  action: 'default',
};

/**
 * Check and enforce rate limit.
 * @returns true if allowed, throws if rate limited
 */
export async function checkRateLimit(
  identifier: string,
  config: Partial<RateLimitConfig> = {}
): Promise<boolean> {
  const { maxAttempts, windowSeconds, action } = { ...DEFAULT_CONFIG, ...config };
  const key = `${action}:${identifier}`;

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString();

  // Count recent attempts
  const { count, error: countError } = await supabaseAdmin
    .from('rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('key', key)
    .gte('created_at', windowStart);

  if (countError) {
    console.error('[rateLimiter] Count error:', countError);
    // Fail open — don't block users if rate_limits table has issues
    return true;
  }

  if ((count ?? 0) >= maxAttempts) {
    console.warn(`[rateLimiter] Rate limited: ${key} (${count}/${maxAttempts} in ${windowSeconds}s)`);
    throw new Error(`Trop de tentatives. Veuillez réessayer dans ${Math.ceil(windowSeconds / 60)} minutes.`);
  }

  // Record this attempt
  const { error: insertError } = await supabaseAdmin
    .from('rate_limits')
    .insert({ key, created_at: new Date().toISOString() });

  if (insertError) {
    console.error('[rateLimiter] Insert error:', insertError);
  }

  return true;
}
