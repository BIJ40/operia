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
 * Tries custom token first (Bearer token → apporteur_sessions),
 * then falls back to Supabase JWT (Bearer token → auth.users → apporteur_users).
 * Returns apporteur info or null.
 */
export async function authenticateApporteur(req: Request): Promise<ApporteurAuthResult | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.substring(7);
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

  const supabaseAdmin = createClient(supabaseUrl, serviceKey);

  // --- Try 1: Custom apporteur session token ---
  try {
    const tokenHash = await sha256(token);
    const { data: session } = await supabaseAdmin
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

    if (session) {
      // deno-lint-ignore no-explicit-any
      const manager = session.apporteur_managers as any;
      if (manager?.is_active && manager.apporteurs?.is_active) {
        const apporteur = manager.apporteurs;
        if (!apporteur.apogee_client_id) return null; // non raccordé

        // Get agency slug
        const { data: agency } = await supabaseAdmin
          .from('apogee_agencies')
          .select('slug')
          .eq('id', manager.agency_id)
          .single();

        if (!agency?.slug) return null;

        return {
          apporteurId: apporteur.id,
          agencyId: manager.agency_id,
          apogeeClientId: apporteur.apogee_client_id,
          agencySlug: agency.slug,
          apporteurName: apporteur.name,
        };
      }
    }
  } catch (e) {
    console.warn('[apporteurAuth] Custom token check failed:', e);
  }

  // --- Try 2: Supabase JWT ---
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
