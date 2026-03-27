import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const APOGEE_API_KEY = Deno.env.get('APOGEE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Edge function pour enregistrer un paiement réussi
 * Appelée depuis la page de succès après redirection Stripe
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, refDossier, agencySlug } = await req.json();

    console.log('Record payment request:', { sessionId, refDossier, agencySlug });

    if (!sessionId || !refDossier) {
      return new Response(
        JSON.stringify({ error: 'MISSING_PARAMS', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the session with Stripe
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'STRIPE_NOT_CONFIGURED', success: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Retrieve the session to verify payment status
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    console.log('Stripe session status:', session.payment_status, 'metadata:', session.metadata);

    // Verify the session is paid and matches the dossier
    if (session.payment_status !== 'paid') {
      console.log('Payment not completed:', session.payment_status);
      return new Response(
        JSON.stringify({ error: 'PAYMENT_NOT_COMPLETED', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify metadata matches
    if (session.metadata?.refDossier !== refDossier) {
      console.log('Ref dossier mismatch:', session.metadata?.refDossier, 'vs', refDossier);
      return new Response(
        JSON.stringify({ error: 'INVALID_SESSION', success: false }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if payment already recorded (idempotency)
    const { data: existingPayment } = await supabase
      .from('payments_clients_suivi')
      .select('id')
      .eq('stripe_session_id', sessionId)
      .single();

    if (existingPayment) {
      console.log('Payment already recorded:', existingPayment.id);
      return new Response(
        JSON.stringify({ success: true, alreadyRecorded: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resolve client name from Apogée API
    let clientName: string | null = null;
    try {
      const resolvedSlug = agencySlug || session.metadata?.agencySlug || 'dax';
      const { data: agency } = await supabase
        .from('agency_suivi_settings')
        .select('api_subdomain')
        .eq('slug', resolvedSlug)
        .maybeSingle();

      if (agency?.api_subdomain && APOGEE_API_KEY && refDossier) {
        const apiUrl = `https://${agency.api_subdomain}.hc-apogee.fr/api/apiGetProjectByRef`;
        const apiResp = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ API_KEY: APOGEE_API_KEY, ref: refDossier }),
        });
        if (apiResp.ok) {
          const rawData = await apiResp.json();
          const projectData = Array.isArray(rawData) ? rawData[0] : rawData;
          const client = projectData?.client;
          if (client) {
            clientName = [client.prenom, client.nom].filter(Boolean).join(' ') || null;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to resolve client name:', e);
    }

    // Record the payment
    const amountCents = session.amount_total || 0;
    const { data: payment, error } = await supabase
      .from('payments_clients_suivi')
      .insert({
        ref_dossier: refDossier,
        agency_slug: agencySlug || session.metadata?.agencySlug || 'dax',
        amount_cents: amountCents,
        stripe_session_id: sessionId,
        paid_at: new Date().toISOString(),
        client_name: clientName,
      })
      .select()
      .single();

    if (error) {
      console.error('Error recording payment:', error);
      return new Response(
        JSON.stringify({ error: 'DB_ERROR', success: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Payment recorded successfully:', payment.id);

    return new Response(
      JSON.stringify({ success: true, paymentId: payment.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Record payment error:', error);
    return new Response(
      JSON.stringify({ error: 'UNKNOWN_ERROR', success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
