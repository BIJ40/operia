import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const APOGEE_API_KEY = Deno.env.get('APOGEE_API_KEY');

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DAX_DEFAULTS = {
  api_subdomain: "dax"
};

interface CheckPaymentRequest {
  refDossier: string;
  codePostal: string;
  agencySlug?: string;
}

async function getAgencySubdomain(agencySlug: string | undefined): Promise<string> {
  if (!agencySlug) return DAX_DEFAULTS.api_subdomain;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) return DAX_DEFAULTS.api_subdomain;

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase
      .from("agency_suivi_settings")
      .select("api_subdomain")
      .eq("slug", agencySlug)
      .eq("is_active", true)
      .single();

    if (error || !data) return DAX_DEFAULTS.api_subdomain;

    return data.api_subdomain;
  } catch (err) {
    return DAX_DEFAULTS.api_subdomain;
  }
}

async function verifyPostalCode(apiSubdomain: string, refDossier: string, codePostal: string): Promise<boolean> {
  try {
    const projectResponse = await fetch(`https://${apiSubdomain}.hc-apogee.fr/api/apiGetProjectByRef`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ API_KEY: APOGEE_API_KEY, ref: refDossier }),
    });

    if (!projectResponse.ok) return false;
    
    const project = await projectResponse.json();
    const projectData = Array.isArray(project) ? project[0] : project;
    
    if (!projectData?.clientId) return false;

    const clientsResponse = await fetch(`https://${apiSubdomain}.hc-apogee.fr/api/apiGetClients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ API_KEY: APOGEE_API_KEY }),
    });

    if (!clientsResponse.ok) return false;
    
    const clients = await clientsResponse.json();
    const client = Array.isArray(clients) ? clients.find((c: any) => c.id === projectData.clientId) : null;
    
    if (!client) return false;

    let clientPostalCode = client.codePostal;
    if (!clientPostalCode && client.address) {
      const match = client.address.match(/\b\d{5}\b/);
      if (match) clientPostalCode = match[0];
    }

    return clientPostalCode === codePostal.trim();
  } catch (err) {
    return false;
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { refDossier, codePostal, agencySlug }: CheckPaymentRequest = await req.json();

    // Input validation
    if (!refDossier || !codePostal) {
      return new Response(
        JSON.stringify({ error: "Paramètres manquants" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Check payment status - verifying access");

    const apiSubdomain = await getAgencySubdomain(agencySlug);

    // SECURITY: Verify postal code before returning any payment info
    const isVerified = await verifyPostalCode(apiSubdomain, refDossier, codePostal);
    
    if (!isVerified) {
      console.log("Payment status check refused: verification failed");
      return new Response(
        JSON.stringify({ error: "Accès refusé" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Verification OK, checking payment status");

    // Query payment status using service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: payments, error } = await supabase
      .from("payments_clients_suivi")
      .select("id, paid_at, amount_cents")
      .eq("ref_dossier", refDossier)
      .order("paid_at", { ascending: false });

    if (error) {
      console.error("Error querying payments:", error);
      return new Response(
        JSON.stringify({ error: "Erreur serveur" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const totalPaidCents = (payments || []).reduce((sum: number, p: any) => sum + (p.amount_cents || 0), 0);
    const lastPayment = payments && payments.length > 0 ? payments[0] : null;

    // Return status, date, and total paid amount
    return new Response(
      JSON.stringify({
        isPaid: !!lastPayment,
        paidDate: lastPayment?.paid_at || null,
        totalPaidCents,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in check-payment-status function:", error);
    return new Response(
      JSON.stringify({ error: "Erreur serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
