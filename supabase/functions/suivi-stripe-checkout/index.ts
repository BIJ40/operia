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

  const text = await response.text();
  if (!text || text.trim().length === 0) {
    console.warn(`Apogee API returned empty body for ${endpoint}`);
    return null;
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error(`Apogee API returned invalid JSON for ${endpoint}:`, text.substring(0, 200));
    return null;
  }
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

function getBaseUrl(req: Request): string {
  const origin = req.headers.get('origin');
  if (origin) return origin;

  const referer = req.headers.get('referer');
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      console.warn('Unable to parse referer origin');
    }
  }

  return 'https://suivi.helpconfort.services';
}

function normalizeReturnPath(returnUrl: string | null): string {
  if (!returnUrl) return '/';

  try {
    const decoded = decodeURIComponent(returnUrl).trim();
    return decoded.startsWith('/') ? decoded : '/';
  } catch {
    return returnUrl.startsWith('/') ? returnUrl : '/';
  }
}

function buildPaymentPath(returnPath: string, agencySlug: string, status: 'success' | 'cancel'): string {
  const segments = returnPath.split('/').filter(Boolean);
  const agencyIndex = segments.indexOf(agencySlug);
  const prefixSegments = agencyIndex > 0 ? segments.slice(0, agencyIndex) : [];
  const prefix = prefixSegments.length > 0 ? `/${prefixSegments.join('/')}` : '';

  return `${prefix}/${agencySlug}/paiement/${status}`;
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
    const returnUrl = url.searchParams.get('returnUrl');
    // NOTE: amount param is IGNORED for security - we calculate server-side from Apogée data

    console.log('Stripe Checkout request:', { agencySlug, refDossier, returnUrl });

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
    const rawStripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!rawStripeKey) {
      console.error('STRIPE_SECRET_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'STRIPE_NOT_CONFIGURED', message: 'Stripe n\'est pas configuré' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // Strip any non-ASCII / invisible chars that break Deno's fetch headers
    const stripeSecretKey = rawStripeKey.replace(/[^\x20-\x7E]/g, '').trim();
    console.log(`Stripe key prefix: ${stripeSecretKey.substring(0, 8)}..., len=${stripeSecretKey.length}`);

    // Build success and cancel URLs
    const baseUrl = getBaseUrl(req);
    const normalizedReturnPath = normalizeReturnPath(returnUrl);
    const successPath = buildPaymentPath(normalizedReturnPath, agencySlug, 'success');
    const cancelPath = buildPaymentPath(normalizedReturnPath, agencySlug, 'cancel');
    const successQuery = new URLSearchParams({
      payment: 'success',
      ref: refDossier,
      returnUrl: normalizedReturnPath,
    });
    const cancelQuery = new URLSearchParams({
      payment: 'cancelled',
      ref: refDossier,
      returnUrl: normalizedReturnPath,
    });
    const successUrl = `${baseUrl}${successPath}?${successQuery.toString()}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}${cancelPath}?${cancelQuery.toString()}`;

    console.log('Creating Stripe Checkout session:', { amount: serverCalculatedAmount, successUrl, cancelUrl, baseUrl, normalizedReturnPath });

    // Use raw fetch to Stripe API to avoid SDK ByteString bug on Deno
    const params = new URLSearchParams();
    params.append('payment_method_types[]', 'card');
    params.append('line_items[0][price_data][currency]', 'eur');
    params.append('line_items[0][price_data][product_data][name]', 'Paiement dossier');
    params.append('line_items[0][price_data][product_data][description]', 'Règlement Help! Confort');
    params.append('line_items[0][price_data][unit_amount]', String(Math.round(serverCalculatedAmount * 100)));
    params.append('line_items[0][quantity]', '1');
    params.append('mode', 'payment');
    params.append('success_url', successUrl);
    params.append('cancel_url', cancelUrl);
    params.append('metadata[refDossier]', refDossier);
    params.append('metadata[agencySlug]', agencySlug);
    params.append('metadata[serverAmount]', serverCalculatedAmount.toString());
    params.append('locale', 'fr');

    const stripeResp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const session = await stripeResp.json();

    if (!stripeResp.ok) {
      console.error('Stripe API error:', session);
      return new Response(
        JSON.stringify({ error: 'STRIPE_ERROR', message: session.error?.message || 'Erreur Stripe' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
