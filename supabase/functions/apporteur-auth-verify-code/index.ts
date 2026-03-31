/**
 * apporteur-auth-verify-code
 * Vérifie le code OTP et crée une session apporteur
 * 
 * Rate limiting: 5 essais erronés / 15min par (email+ip)
 * Session: 90 jours, cookie httpOnly en prod, token en body en dev
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

// Generate session token
function generateSessionToken(): string {
  return crypto.randomUUID();
}

// Check if running in dev environment via explicit env var
function isDevEnvironment(): boolean {
  return Deno.env.get("DENO_ENV") === "development";
}

// Rate limit configuration
const RATE_LIMIT = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  blockDurationMs: 30 * 60 * 1000, // 30 minutes block after too many failures
};

// Session configuration
const SESSION_DURATION_DAYS = 90;

Deno.serve(async (req) => {
  // CORS handling
  const corsResponse = handleCorsPreflightOrReject(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get("origin") ?? "";
  const corsHeaders = isOriginAllowed(origin) ? getCorsHeaders(origin) : {};

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { email, code } = await req.json();

    if (!email || typeof email !== "string" || !code || typeof code !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "Email et code requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
      return new Response(
        JSON.stringify({ success: false, error: "Code invalide" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("cf-connecting-ip") || 
                     "0.0.0.0";
    const userAgent = req.headers.get("user-agent") || "";

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limit check for failed attempts
    const rateLimitKey = `apporteur_verify:${normalizedEmail}:${clientIp}`;
    const windowStart = new Date(Date.now() - RATE_LIMIT.windowMs).toISOString();

    const { count: failedAttempts } = await supabase
      .from("rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("key", rateLimitKey)
      .gte("created_at", windowStart);

    if ((failedAttempts ?? 0) >= RATE_LIMIT.maxAttempts) {
      console.log(`[APPORTEUR-AUTH] Verify rate limit exceeded for ${normalizedEmail}`);
      return new Response(
        JSON.stringify({ success: false, error: "Trop de tentatives. Compte temporairement bloqué." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "1800" } }
      );
    }

    // Find manager by email
    const { data: manager, error: managerError } = await supabase
      .from("apporteur_managers")
      .select(`
        id,
        apporteur_id,
        agency_id,
        email,
        first_name,
        last_name,
        role,
        is_active,
        email_verified_at,
        apporteurs:apporteur_id (name, portal_enabled, is_active)
      `)
      .ilike("email", normalizedEmail)
      .eq("is_active", true)
      .maybeSingle();

    if (managerError || !manager) {
      // Record failed attempt
      await supabase.from("rate_limits").insert({ key: rateLimitKey });
      return new Response(
        JSON.stringify({ success: false, error: "Code invalide ou expiré" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check portal status
    const apporteur = manager.apporteurs as unknown as { name: string; portal_enabled: boolean; is_active: boolean } | null;
    if (!apporteur?.portal_enabled || !apporteur?.is_active) {
      await supabase.from("rate_limits").insert({ key: rateLimitKey });
      return new Response(
        JSON.stringify({ success: false, error: "Accès non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DEV TEST BYPASS: accept code "000000" for test account only when DENO_ENV=development
    const isTestBypass = isDevEnvironment() && code === "000000" && normalizedEmail === "apporteur@test.com";

    if (!isTestBypass) {
      // Hash the submitted code and verify against stored codes
      const codeHash = await sha256(code);

      const { data: otpRecord, error: otpError } = await supabase
        .from("apporteur_otp_codes")
        .select("id, expires_at")
        .eq("manager_id", manager.id)
        .eq("code_hash", codeHash)
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (otpError || !otpRecord) {
        // Record failed attempt
        await supabase.from("rate_limits").insert({ key: rateLimitKey });
        console.log(`[APPORTEUR-AUTH] Invalid or expired OTP for ${normalizedEmail}`);
        return new Response(
          JSON.stringify({ success: false, error: "Code invalide ou expiré" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark OTP as used
      await supabase
        .from("apporteur_otp_codes")
        .update({ used_at: new Date().toISOString() })
        .eq("id", otpRecord.id);
    } else {
      console.log(`[APPORTEUR-AUTH] DEV TEST BYPASS used for ${normalizedEmail}`);
    }

    // Generate session token
    const sessionToken = generateSessionToken();
    const tokenHash = await sha256(sessionToken);
    const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

    // Create session
    const { error: sessionError } = await supabase.from("apporteur_sessions").insert({
      manager_id: manager.id,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
      ip_address: clientIp,
      user_agent: userAgent,
    });

    if (sessionError) {
      console.error("[APPORTEUR-AUTH] Failed to create session:", sessionError);
      return new Response(
        JSON.stringify({ success: false, error: "Erreur serveur. Veuillez réessayer." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update last login
    await supabase
      .from("apporteur_managers")
      .update({ 
        last_login_at: new Date().toISOString(),
        email_verified_at: manager.email_verified_at || new Date().toISOString()
      })
      .eq("id", manager.id);

    // Clear failed attempts on successful login
    await supabase.from("rate_limits").delete().eq("key", rateLimitKey);

    console.log(`[APPORTEUR-AUTH] Login successful for ${normalizedEmail}`);

    // Prepare response
    const responseData = {
      success: true,
      manager: {
        id: manager.id,
        apporteurId: manager.apporteur_id,
        apporteurName: apporteur.name,
        agencyId: manager.agency_id,
        email: manager.email,
        firstName: manager.first_name,
        lastName: manager.last_name,
        role: manager.role as "reader" | "manager",
      },
      expiresAt: expiresAt.toISOString(),
      // Always return token in body — cookie approach doesn't work cross-origin
      token: sessionToken,
    };

    // Set httpOnly cookie for production
    const cookieValue = `apporteur_token=${sessionToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_DURATION_DAYS * 24 * 60 * 60}`;

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Set-Cookie": cookieValue,
      },
    });
  } catch (error) {
    console.error("[APPORTEUR-AUTH] Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Erreur serveur. Veuillez réessayer." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
