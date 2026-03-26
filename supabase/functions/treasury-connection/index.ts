import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ success: false, error: { code: "AUTH", message: "Non authentifié" } }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User client for auth
    const userClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ success: false, error: { code: "AUTH", message: "Token invalide" } }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    // Service client for writes
    const serviceClient = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { action } = body;

    // Get user's agency
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("agency_id")
      .eq("id", userId)
      .single();

    if (!profile?.agency_id) {
      return new Response(JSON.stringify({ success: false, error: { code: "NO_AGENCY", message: "Agence non trouvée" } }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const agencyId = profile.agency_id;

    // ── CREATE CONNECTION ──
    if (action === "create") {
      const { displayName, provider } = body;
      if (!displayName || typeof displayName !== "string" || displayName.trim().length < 2) {
        return new Response(JSON.stringify({ success: false, error: { code: "VALIDATION", message: "Nom de connexion invalide (min 2 caractères)" } }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: connection, error: insertErr } = await serviceClient
        .from("bank_connections")
        .insert({
          agency_id: agencyId,
          user_id: userId,
          display_name: displayName.trim(),
          provider: provider || "bridge",
          status: "pending",
        })
        .select()
        .single();

      if (insertErr) {
        console.error("Insert error:", insertErr);
        return new Response(JSON.stringify({ success: false, error: { code: "DB", message: "Erreur lors de la création" } }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Log the action
      await serviceClient.from("activity_log").insert({
        actor_id: userId,
        actor_type: "user",
        agency_id: agencyId,
        module: "tresorerie",
        entity_type: "bank_connection",
        entity_id: connection.id,
        entity_label: displayName.trim(),
        action: "create",
      });

      return new Response(JSON.stringify({ success: true, data: connection }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── DISCONNECT ──
    if (action === "disconnect") {
      const { connectionId } = body;
      if (!connectionId) {
        return new Response(JSON.stringify({ success: false, error: { code: "VALIDATION", message: "connectionId requis" } }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify ownership
      const { data: conn } = await serviceClient
        .from("bank_connections")
        .select("id, agency_id, user_id, display_name")
        .eq("id", connectionId)
        .single();

      if (!conn || conn.agency_id !== agencyId) {
        return new Response(JSON.stringify({ success: false, error: { code: "FORBIDDEN", message: "Connexion non trouvée ou accès refusé" } }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: updateErr } = await serviceClient
        .from("bank_connections")
        .update({ status: "disconnected", updated_at: new Date().toISOString() })
        .eq("id", connectionId);

      if (updateErr) {
        return new Response(JSON.stringify({ success: false, error: { code: "DB", message: "Erreur lors de la déconnexion" } }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await serviceClient.from("activity_log").insert({
        actor_id: userId,
        actor_type: "user",
        agency_id: agencyId,
        module: "tresorerie",
        entity_type: "bank_connection",
        entity_id: connectionId,
        entity_label: conn.display_name,
        action: "disconnect",
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── SYNC (placeholder — will call real provider later) ──
    if (action === "sync") {
      const { connectionId } = body;
      if (!connectionId) {
        return new Response(JSON.stringify({ success: false, error: { code: "VALIDATION", message: "connectionId requis" } }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: conn } = await serviceClient
        .from("bank_connections")
        .select("id, agency_id, status")
        .eq("id", connectionId)
        .single();

      if (!conn || conn.agency_id !== agencyId) {
        return new Response(JSON.stringify({ success: false, error: { code: "FORBIDDEN", message: "Connexion non trouvée" } }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create sync log
      await serviceClient.from("bank_sync_logs").insert({
        bank_connection_id: connectionId,
        sync_type: "full",
        status: "started",
      });

      // For now, just update last_sync_at — real provider sync will come later
      await serviceClient
        .from("bank_connections")
        .update({
          last_sync_at: new Date().toISOString(),
          status: conn.status === "error" ? "pending" : conn.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", connectionId);

      return new Response(JSON.stringify({ success: true, message: "Synchronisation enregistrée. Le provider bancaire n'est pas encore branché." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: false, error: { code: "UNKNOWN_ACTION", message: `Action '${action}' inconnue` } }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("treasury-connection error:", err);
    return new Response(JSON.stringify({ success: false, error: { code: "INTERNAL", message: "Erreur serveur" } }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
