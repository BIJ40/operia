/**
 * apporteur-auth-validate-session
 * Valide une session apporteur existante
 * 
 * Accepte:
 * - Cookie: apporteur_token (prioritaire)
 * - Header: Authorization: Bearer <token>
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCorsPreflightOrReject, getCorsHeaders, isOriginAllowed } from "../_shared/cors.ts";

// SHA-256 hash helper
async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Extract token from request (cookie priority, then header)
function extractToken(req: Request): string | null {
  // Try x-apporteur-token header first (cross-origin compatible)
  const customHeader = req.headers.get("x-apporteur-token") ?? req.headers.get("X-Apporteur-Token");
  if (customHeader?.trim()) return customHeader.trim();

  // Try cookie
  const cookieHeader = req.headers.get("cookie");
  if (cookieHeader) {
    const cookies = cookieHeader.split(";").map(c => c.trim());
    const tokenCookie = cookies.find(c => c.startsWith("apporteur_token="));
    if (tokenCookie) {
      return tokenCookie.split("=")[1];
    }
  }

  // Try Authorization header (non-JWT tokens only)
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    // Skip if it looks like a JWT (contains dots)
    if (!token.includes('.')) {
      return token;
    }
  }

  return null;
}

Deno.serve(async (req) => {
  // CORS handling
  const corsResponse = handleCorsPreflightOrReject(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get("origin") ?? "";
  const corsHeaders = isOriginAllowed(origin) ? getCorsHeaders(origin) : {};

  // Allow both GET and POST for flexibility
  if (req.method !== "GET" && req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const token = extractToken(req);

    if (!token) {
      return new Response(
        JSON.stringify({ valid: false, error: "Token manquant" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Hash the token
    const tokenHash = await sha256(token);

    // Find valid session
    const { data: session, error: sessionError } = await supabase
      .from("apporteur_sessions")
      .select(`
        id,
        manager_id,
        expires_at,
        revoked_at,
        apporteur_managers:manager_id (
          id,
          apporteur_id,
          agency_id,
          email,
          first_name,
          last_name,
          role,
          is_active,
          apporteurs:apporteur_id (name, portal_enabled, is_active)
        )
      `)
      .eq("token_hash", tokenHash)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ valid: false, error: "Session invalide ou expirée" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const manager = session.apporteur_managers as unknown as {
      id: string;
      apporteur_id: string;
      agency_id: string;
      email: string;
      first_name: string | null;
      last_name: string | null;
      role: string;
      is_active: boolean;
      apporteurs: { name: string; portal_enabled: boolean; is_active: boolean } | null;
    };

    // Verify manager is still active
    if (!manager?.is_active) {
      return new Response(
        JSON.stringify({ valid: false, error: "Compte désactivé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify portal is still enabled
    const apporteur = manager.apporteurs;
    if (!apporteur?.portal_enabled || !apporteur?.is_active) {
      return new Response(
        JSON.stringify({ valid: false, error: "Portail désactivé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        valid: true,
        session: {
          managerId: manager.id,
          apporteurId: manager.apporteur_id,
          apporteurName: apporteur.name,
          agencyId: manager.agency_id,
          email: manager.email,
          firstName: manager.first_name,
          lastName: manager.last_name,
          role: manager.role as "reader" | "manager",
          expiresAt: session.expires_at,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[APPORTEUR-AUTH] Validate error:", error);
    return new Response(
      JSON.stringify({ valid: false, error: "Erreur serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
