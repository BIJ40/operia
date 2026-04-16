import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const APOGEE_API_KEY = Deno.env.get('APOGEE_API_KEY');

async function fetchFromApogeeWithData(apiSubdomain: string, endpoint: string, additionalData: Record<string, any>): Promise<any> {
  const url = `https://${apiSubdomain}.hc-apogee.fr/api/${endpoint}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ API_KEY: APOGEE_API_KEY, ...additionalData }),
  });

  if (!response.ok) {
    console.error(`Apogee API error for ${endpoint}:`, response.status, response.statusText);
    return null;
  }

  return response.json();
}

async function fetchFromApogee(apiSubdomain: string, endpoint: string): Promise<any> {
  return fetchFromApogeeWithData(apiSubdomain, endpoint, {});
}

function extractClientPostalCode(client: any): string | null {
  if (!client) return null;
  if (client.codePostal) return client.codePostal;
  if (client.address) {
    const match = client.address.match(/\b\d{5}\b/);
    if (match) return match[0];
  }
  return null;
}

// Extract the amount to be paid from project financial data - SERVER-SIDE ONLY
// Business logic aligned with the UI:
// - Franchise flow: franchise - sumFranchisePaid (or aPercevoir fallback)
// - Standard flow: aPercevoir - acompte
function toAmount(value: unknown): number {
  const parsed = parseFloat(String(value ?? 0));
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function extractAmountToPay(project: any): number | null {
  if (!project?.data?.financier) return null;

  const financier = project.data.financier;
  const franchise = toAmount(financier.franchise);
  const acompte = toAmount(financier.acompte);
  const aPercevoir = toAmount(financier.aPercevoir);
  const isSommesPercues = financier.isSommesPercues;

  const hasFranchisePaid = project?.sumFranchisePaid !== undefined && project?.sumFranchisePaid !== null;
  const sumFranchisePaid = hasFranchisePaid ? toAmount(project.sumFranchisePaid) : undefined;

  // Hash-based franchise flow (priority when franchise exists)
  if (franchise > 0) {
    if (sumFranchisePaid !== undefined) {
      const remainingFranchise = franchise - sumFranchisePaid;
      return remainingFranchise > 0 ? roundCurrency(remainingFranchise) : 0;
    }

    // Legacy fallback when sumFranchisePaid is not available
    if (isSommesPercues === 'oui') return 0;
    return aPercevoir > 0 ? roundCurrency(aPercevoir) : 0;
  }

  // Standard flow
  if (isSommesPercues === 'oui') return 0;

  const restantDu = aPercevoir - acompte;
  return restantDu > 0 ? roundCurrency(restantDu) : 0;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const agencySlug = url.searchParams.get('agencySlug');
    const refDossier = url.searchParams.get('refDossier');
    const codePostal = url.searchParams.get('codePostal'); // Required for verification
    // NOTE: amount param is IGNORED for security - we calculate server-side from Apogée data

    console.log('Stripe Checkout request:', { agencySlug, refDossier });

    // Validate required parameters (amount is NOT required - calculated server-side)
    if (!agencySlug || !refDossier || !codePostal) {
      return new Response(
        JSON.stringify({ error: 'MISSING_PARAMS', message: 'Paramètres manquants' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get agency data including stripe_enabled
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let apiSubdomain = 'dax';
    let stripeEnabled = true; // Default for Dax
    
    const { data: agency } = await supabase
      .from('agency_suivi_settings')
      .select('api_subdomain, stripe_enabled')
      .eq('slug', agencySlug)
      .eq('is_active', true)
      .single();

    if (agency) {
      apiSubdomain = agency.api_subdomain;
      stripeEnabled = agency.stripe_enabled ?? false;
    }

    // Security check: Stripe must be enabled for this agency
    if (!stripeEnabled) {
      console.log('Stripe Checkout: Stripe not enabled for agency', agencySlug);
      return new Response(
        JSON.stringify({ error: 'STRIPE_NOT_ENABLED', message: 'Le paiement en ligne n\'est pas activé pour cette agence' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the dossier exists and postal code matches
    const project = await fetchFromApogeeWithData(apiSubdomain, 'apiGetProjectByRef', { ref: refDossier });
    
    if (!project || (Array.isArray(project) && project.length === 0)) {
      console.log('Stripe Checkout: Project not found');
      return new Response(
        JSON.stringify({ error: 'ACCESS_DENIED', message: 'Accès refusé' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const projectData = Array.isArray(project) ? project[0] : project;
    
    // Fetch client to verify postal code
    const clients = await fetchFromApogee(apiSubdomain, 'apiGetClients');
    const projectClient = Array.isArray(clients)
      ? clients.find((c: any) => c.id === projectData.clientId)
      : null;

    const clientPostalCode = extractClientPostalCode(projectClient);
    
    if (!clientPostalCode || codePostal.trim() !== clientPostalCode) {
      console.log('Stripe Checkout: Postal code verification failed');
      return new Response(
        JSON.stringify({ error: 'ACCESS_DENIED', message: 'Accès refusé' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Stripe Checkout: Verification successful');

    // SECURITY: Calculate amount from Apogée data - NEVER trust client-provided amount
    const serverCalculatedAmount = extractAmountToPay(projectData);
    
    if (serverCalculatedAmount === null || serverCalculatedAmount <= 0) {
      console.log('Stripe Checkout: No amount due or invalid amount');
      return new Response(
        JSON.stringify({ error: 'NO_AMOUNT_DUE', message: 'Aucun montant à payer' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Stripe Checkout: Server-calculated amount: ${serverCalculatedAmount}€`);

    // Get Stripe secret key from environment
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'STRIPE_NOT_CONFIGURED', message: 'Stripe n\'est pas configuré' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Build success and cancel URLs
    const baseUrl = 'https://suivi.helpconfort.services';
    const returnPath = agencySlug === 'dax' ? `/${refDossier}` : `/${agencySlug}/${refDossier}`;
    // Include {CHECKOUT_SESSION_ID} placeholder - Stripe will replace it with actual session ID
    const successUrl = `${baseUrl}${returnPath}?payment=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}${returnPath}?payment=cancelled`;

    console.log('Creating Stripe Checkout session:', { amount: serverCalculatedAmount, successUrl, cancelUrl });

    // Create Stripe Checkout Session with SERVER-CALCULATED amount
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Paiement dossier`,
              description: `Règlement Help! Confort`,
            },
            unit_amount: Math.round(serverCalculatedAmount * 100), // Stripe uses cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        refDossier,
        agencySlug,
        serverAmount: serverCalculatedAmount.toString(), // For audit trail
      },
      locale: 'fr',
    });

    console.log('Stripe Checkout session created:', session.id);

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Stripe Checkout error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    return new Response(
      JSON.stringify({ error: 'STRIPE_ERROR', message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
