/**
 * apporteur-auth-logout
 * Révoque la session apporteur et supprime le cookie
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
  // Try cookie first
  const cookieHeader = req.headers.get("cookie");
  if (cookieHeader) {
    const cookies = cookieHeader.split(";").map(c => c.trim());
    const tokenCookie = cookies.find(c => c.startsWith("apporteur_token="));
    if (tokenCookie) {
      return tokenCookie.split("=")[1];
    }
  }

  // Try Authorization header
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  return null;
}

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
    const token = extractToken(req);

    // Even if no token, we still return success and clear cookie
    // This ensures clean logout state
    const clearCookie = "apporteur_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0";

    if (!token) {
      return new Response(
        JSON.stringify({ success: true }),
        { 
          status: 200, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Set-Cookie": clearCookie,
          } 
        }
      );
    }

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Hash the token and revoke the session
    const tokenHash = await sha256(token);

    const { error: revokeError } = await supabase
      .from("apporteur_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("token_hash", tokenHash)
      .is("revoked_at", null);

    if (revokeError) {
      console.error("[APPORTEUR-AUTH] Failed to revoke session:", revokeError);
      // Still return success to clear client state
    } else {
      console.log("[APPORTEUR-AUTH] Session revoked successfully");
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "Set-Cookie": clearCookie,
        } 
      }
    );
  } catch (error) {
    console.error("[APPORTEUR-AUTH] Logout error:", error);
    // Still try to clear cookie even on error
    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "Set-Cookie": "apporteur_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0",
        } 
      }
    );
  }
});
