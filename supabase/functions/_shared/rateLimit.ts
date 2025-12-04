// Persistent rate limiter using Supabase database
// Falls back to in-memory if database unavailable

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory fallback (used when DB unavailable)
const rateLimitMap = new Map<string, RateLimitEntry>();

interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
}

// Create Supabase admin client for rate limiting
function getSupabaseAdmin() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });
}

// Persistent rate limiting using database
async function checkRateLimitPersistent(
  key: string, 
  options: RateLimitOptions
): Promise<RateLimitResult | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  
  const now = Date.now();
  const windowStart = now - options.windowMs;
  
  try {
    // Count requests in current window
    const { count, error: countError } = await supabase
      .from("rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("key", key)
      .gte("created_at", new Date(windowStart).toISOString());
    
    if (countError) {
      console.error("[RATE-LIMIT] DB count error:", countError.message);
      return null;
    }
    
    const currentCount = count || 0;
    
    if (currentCount >= options.limit) {
      // Calculate retry after based on oldest entry in window
      const { data: oldestEntry } = await supabase
        .from("rate_limits")
        .select("created_at")
        .eq("key", key)
        .gte("created_at", new Date(windowStart).toISOString())
        .order("created_at", { ascending: true })
        .limit(1)
        .single();
      
      const oldestTime = oldestEntry ? new Date(oldestEntry.created_at).getTime() : windowStart;
      const retryAfter = Math.ceil((oldestTime + options.windowMs - now) / 1000);
      
      return { allowed: false, remaining: 0, retryAfter: Math.max(1, retryAfter) };
    }
    
    // Insert new rate limit entry
    const { error: insertError } = await supabase
      .from("rate_limits")
      .insert({ key, created_at: new Date().toISOString() });
    
    if (insertError) {
      console.error("[RATE-LIMIT] DB insert error:", insertError.message);
      return null;
    }
    
    // Cleanup old entries (older than 1 hour) periodically
    if (Math.random() < 0.01) { // 1% chance to cleanup
      await supabase
        .from("rate_limits")
        .delete()
        .lt("created_at", new Date(now - 3600000).toISOString());
    }
    
    return { allowed: true, remaining: options.limit - currentCount - 1 };
  } catch (error) {
    console.error("[RATE-LIMIT] DB error:", error);
    return null;
  }
}

// In-memory fallback rate limiting
function checkRateLimitInMemory(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  // Clean up expired entries periodically
  if (rateLimitMap.size > 10000) {
    for (const [k, v] of rateLimitMap.entries()) {
      if (v.resetAt < now) {
        rateLimitMap.delete(k);
      }
    }
  }

  if (!entry || entry.resetAt < now) {
    // New window
    rateLimitMap.set(key, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    return { allowed: true, remaining: options.limit - 1 };
  }

  if (entry.count >= options.limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }

  entry.count++;
  return { allowed: true, remaining: options.limit - entry.count };
}

// Main rate limit function - tries persistent first, falls back to in-memory
export async function checkRateLimit(
  key: string, 
  options: RateLimitOptions
): Promise<RateLimitResult> {
  // Try persistent rate limiting first
  const persistentResult = await checkRateLimitPersistent(key, options);
  if (persistentResult !== null) {
    return persistentResult;
  }
  
  // Fallback to in-memory
  console.warn("[RATE-LIMIT] Using in-memory fallback (DB unavailable)");
  return checkRateLimitInMemory(key, options);
}

// Synchronous version for backwards compatibility (in-memory only)
export function checkRateLimitSync(key: string, options: RateLimitOptions): RateLimitResult {
  return checkRateLimitInMemory(key, options);
}

export function rateLimitResponse(retryAfter: number, corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ 
      error: "Trop de requêtes. Veuillez réessayer plus tard.",
      retryAfter 
    }),
    { 
      status: 429, 
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter)
      } 
    }
  );
}
