/**
 * Shared apporteur authentication helper
 * Supports both:
 * 1. Supabase JWT (for internal users with apporteur_users link)
 * 2. Custom apporteur session token (for portal OTP auth)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

export interface ApporteurAuthResult {
  apporteurId: string;
  agencyId: string;
  apogeeClientId: number;
  agencySlug: string;
  apporteurName: string;
}

async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Authenticate an apporteur from the request.
 * Tries custom token first (x-apporteur-token / cookie / Bearer non-JWT),
 * then falls back to Supabase JWT.
 * Returns apporteur info or null.
 */
function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.substring(7);
}

function extractCookieToken(req: Request): string | null {
  const cookieHeader = req.headers.get('cookie');
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';').map((c) => c.trim());
  const tokenCookie = cookies.find((c) => c.startsWith('apporteur_token='));
  if (!tokenCookie) return null;
  return tokenCookie.split('=')[1] || null;
}

function extractCustomApporteurToken(req: Request): string | null {
  const headerToken = req.headers.get('x-apporteur-token') ?? req.headers.get('X-Apporteur-Token');
  if (headerToken?.trim()) return headerToken.trim();

  const cookieToken = extractCookieToken(req);
  if (cookieToken) return cookieToken;

  // Backward compatibility: old clients sent custom token in Authorization header
  const bearerToken = extractBearerToken(req);
  if (bearerToken && !bearerToken.includes('.')) {
    return bearerToken;
  }

  return null;
}

export async function authenticateApporteur(req: Request): Promise<ApporteurAuthResult | null> {
  const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization');
  const customToken = extractCustomApporteurToken(req);

  console.log('[apporteurAuth] Starting auth. customToken?', !!customToken, 'length:', customToken?.length ?? 0, 'authHeader?', !!authHeader);

  // Need at least one auth mechanism
  if (!customToken && !authHeader) {
    console.warn('[apporteurAuth] No auth mechanism found (no token, no header)');
    return null;
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

  const supabaseAdmin = createClient(supabaseUrl, serviceKey);

  // --- Try 1: Custom apporteur session token ---
  if (customToken) {
    try {
      const tokenHash = await sha256(customToken);
      console.log('[apporteurAuth] Token hash (first 12):', tokenHash.substring(0, 12));

      const { data: session, error: sessionError } = await supabaseAdmin
        .from('apporteur_sessions')
        .select(`
          id, manager_id, expires_at, revoked_at,
          apporteur_managers:manager_id (
            id, apporteur_id, agency_id, is_active,
            apporteurs:apporteur_id (id, name, apogee_client_id, is_active, portal_enabled)
          )
        `)
        .eq('token_hash', tokenHash)
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (sessionError) {
        console.warn('[apporteurAuth] Session query error:', sessionError.message);
      }

      if (!session) {
        console.warn('[apporteurAuth] No session found for token hash (first 12):', tokenHash.substring(0, 12));
      }

      if (session) {
        // deno-lint-ignore no-explicit-any
        const manager = session.apporteur_managers as any;
        console.log('[apporteurAuth] Session found. manager_id:', session.manager_id, 'manager.is_active:', manager?.is_active, 'apporteur.is_active:', manager?.apporteurs?.is_active, 'apogee_client_id:', manager?.apporteurs?.apogee_client_id);

        if (manager?.is_active && manager.apporteurs?.is_active) {
          const apporteur = manager.apporteurs;
          if (!apporteur.apogee_client_id) {
            console.warn('[apporteurAuth] Apporteur has no apogee_client_id — not linked');
            return null;
          }

          // Get agency slug
          const { data: agency } = await supabaseAdmin
            .from('apogee_agencies')
            .select('slug')
            .eq('id', manager.agency_id)
            .single();

          if (!agency?.slug) {
            console.warn('[apporteurAuth] Agency slug not found for agency_id:', manager.agency_id);
            return null;
          }

          console.log('[apporteurAuth] ✅ Auth success via custom token. apporteur:', apporteur.name, 'agency:', agency.slug);
          return {
            apporteurId: apporteur.id,
            agencyId: manager.agency_id,
            apogeeClientId: apporteur.apogee_client_id,
            agencySlug: agency.slug,
            apporteurName: apporteur.name,
          };
        } else {
          console.warn('[apporteurAuth] Manager or apporteur inactive');
        }
      }
    } catch (e) {
      console.warn('[apporteurAuth] Custom token check failed:', e);
    }
  }

  // --- Try 2: Supabase JWT ---
  if (!authHeader?.startsWith('Bearer ')) return null;

  try {
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return null;

    const { data: apporteurUser } = await supabaseAdmin
      .from('apporteur_users')
      .select('id, apporteur_id, agency_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!apporteurUser) return null;

    const { data: apporteur } = await supabaseAdmin
      .from('apporteurs')
      .select('id, name, apogee_client_id, agency_id')
      .eq('id', apporteurUser.apporteur_id)
      .single();

    if (!apporteur?.apogee_client_id) return null;

    const { data: agency } = await supabaseAdmin
      .from('apogee_agencies')
      .select('slug')
      .eq('id', apporteur.agency_id)
      .single();

    if (!agency?.slug) return null;

    return {
      apporteurId: apporteur.id,
      agencyId: apporteur.agency_id,
      apogeeClientId: apporteur.apogee_client_id,
      agencySlug: agency.slug,
      apporteurName: apporteur.name,
    };
  } catch (e) {
    console.warn('[apporteurAuth] JWT check failed:', e);
  }

  return null;
}
