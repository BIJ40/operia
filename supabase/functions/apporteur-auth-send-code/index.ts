/**
 * apporteur-auth-send-code
 * Envoie un code OTP 6 digits par email pour l'authentification apporteur
 * 
 * Rate limiting: 3 demandes / 15min par (email+ip)
 * OTP TTL: 15 minutes
 * Réponse non révélatrice (200 même si email inconnu)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { handleCorsPreflightOrReject, getCorsHeaders, isOriginAllowed } from "../_shared/cors.ts";

// Resend initialized lazily inside handler to avoid crash if secret is missing at boot
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    const key = Deno.env.get("RESEND_API_KEY");
    if (!key) throw new Error("RESEND_API_KEY not configured");
    _resend = new Resend(key);
  }
  return _resend;
}

// SHA-256 hash helper
async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Rate limit configuration
const RATE_LIMIT = {
  maxRequests: 10,
  windowMs: 5 * 60 * 1000, // 5 minutes
};

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
    const { email } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return new Response(
        JSON.stringify({ success: true, message: "Si cet email est enregistré, un code a été envoyé." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("cf-connecting-ip") || 
                     "0.0.0.0";

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limit check using rate_limits table
    const rateLimitKey = `apporteur_otp:${normalizedEmail}:${clientIp}`;
    const windowStart = new Date(Date.now() - RATE_LIMIT.windowMs).toISOString();

    const { count: recentRequests } = await supabase
      .from("rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("key", rateLimitKey)
      .gte("created_at", windowStart);

    if ((recentRequests ?? 0) >= RATE_LIMIT.maxRequests) {
      console.log(`[APPORTEUR-AUTH] Rate limit exceeded for ${normalizedEmail}`);
      return new Response(
        JSON.stringify({ success: false, error: "Trop de tentatives. Réessayez dans 15 minutes." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "900" } }
      );
    }

    // Record rate limit entry
    await supabase.from("rate_limits").insert({ key: rateLimitKey });

    // Find manager by email (case insensitive)
    const { data: manager, error: managerError } = await supabase
      .from("apporteur_managers")
      .select(`
        id,
        apporteur_id,
        email,
        first_name,
        last_name,
        is_active,
        apporteurs:apporteur_id (name, portal_enabled, is_active)
      `)
      .ilike("email", normalizedEmail)
      .eq("is_active", true)
      .maybeSingle();

    // Non-revealing response - don't leak if email exists
    if (managerError || !manager) {
      console.log(`[APPORTEUR-AUTH] Email not found or error: ${normalizedEmail}`);
      return new Response(
        JSON.stringify({ success: true, message: "Si cet email est enregistré, un code a été envoyé." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if portal is enabled for this apporteur
    const apporteur = manager.apporteurs as unknown as { name: string; portal_enabled: boolean; is_active: boolean } | null;
    if (!apporteur?.portal_enabled || !apporteur?.is_active) {
      console.log(`[APPORTEUR-AUTH] Portal not enabled for apporteur: ${manager.apporteur_id}`);
      return new Response(
        JSON.stringify({ success: true, message: "Si cet email est enregistré, un code a été envoyé." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Invalidate any existing unused OTP codes for this manager
    await supabase
      .from("apporteur_otp_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("manager_id", manager.id)
      .is("used_at", null);

    // Generate and store new OTP
    const otp = generateOTP();
    const otpHash = await sha256(otp);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const { error: insertError } = await supabase.from("apporteur_otp_codes").insert({
      manager_id: manager.id,
      code_hash: otpHash,
      expires_at: expiresAt.toISOString(),
      ip_address: clientIp,
    });

    if (insertError) {
      console.error("[APPORTEUR-AUTH] Failed to insert OTP:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: "Erreur serveur. Veuillez réessayer." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send email via Resend
    const firstName = manager.first_name || "Partenaire";
    const emailResult = await resend.emails.send({
      from: "HelpConfort <noreply@helpconfort.services>",
      to: [manager.email],
      subject: "Votre code de connexion HelpConfort",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1e3a5f; margin: 0;">HelpConfort</h1>
              <p style="color: #666; font-size: 14px;">Espace Partenaire</p>
            </div>
            
            <p style="color: #333; font-size: 16px;">Bonjour ${firstName},</p>
            
            <p style="color: #333; font-size: 16px;">Voici votre code de connexion :</p>
            
            <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0;">
              <span style="font-size: 36px; font-weight: bold; color: #ffffff; letter-spacing: 8px;">${otp}</span>
            </div>
            
            <p style="color: #666; font-size: 14px; text-align: center;">
              Ce code expire dans <strong>15 minutes</strong>.
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              Si vous n'avez pas demandé ce code, ignorez cet email.<br>
              Ne partagez jamais ce code avec qui que ce soit.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    if (emailResult.error) {
      console.error("[APPORTEUR-AUTH] Failed to send email:", emailResult.error);
      return new Response(
        JSON.stringify({ success: false, error: "Erreur d'envoi email. Veuillez réessayer." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[APPORTEUR-AUTH] OTP sent successfully to ${normalizedEmail}`);

    return new Response(
      JSON.stringify({ success: true, message: "Si cet email est enregistré, un code a été envoyé." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[APPORTEUR-AUTH] Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Erreur serveur. Veuillez réessayer." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
