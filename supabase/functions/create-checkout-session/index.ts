import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')?.replace(/[^\x20-\x7E]/g, '');
    if (!STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const supabase = createClient(supabaseUrl, supabaseKey);
    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) throw new Error('Unauthorized');

    const { plan_key, agency_id } = await req.json();
    if (!plan_key || !agency_id) throw new Error('Missing plan_key or agency_id');
    if (!['pilotage', 'suivi'].includes(plan_key)) throw new Error('Invalid plan_key');

    // Price IDs — à configurer avec les vrais IDs Stripe
    const PRICE_MAP: Record<string, string> = {
      pilotage: Deno.env.get('STRIPE_PRICE_PILOTAGE') || 'price_pilotage_placeholder',
      suivi: Deno.env.get('STRIPE_PRICE_SUIVI') || 'price_suivi_placeholder',
    };

    // Check if already subscribed
    const { data: existing } = await supabase
      .from('user_subscriptions')
      .select('id, status')
      .eq('agency_id', agency_id)
      .eq('plan_key', plan_key)
      .maybeSingle();

    if (existing?.status === 'active') {
      return new Response(JSON.stringify({ error: 'Already subscribed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get or create Stripe customer
    let stripeCustomerId: string | null = null;
    const { data: existingSub } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('agency_id', agency_id)
      .not('stripe_customer_id', 'is', null)
      .limit(1)
      .maybeSingle();

    stripeCustomerId = existingSub?.stripe_customer_id || null;

    if (!stripeCustomerId) {
      // Create Stripe customer
      const customerRes = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          email: user.email || '',
          'metadata[agency_id]': agency_id,
          'metadata[user_id]': user.id,
        }),
      });
      const customer = await customerRes.json();
      if (!customerRes.ok) throw new Error(`Stripe customer error: ${JSON.stringify(customer)}`);
      stripeCustomerId = customer.id;
    }

    // Determine success/cancel URLs
    const origin = req.headers.get('origin') || 'https://operiav2.lovable.app';

    // Create Checkout Session
    const sessionRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        customer: stripeCustomerId!,
        mode: 'subscription',
        'line_items[0][price]': PRICE_MAP[plan_key],
        'line_items[0][quantity]': '1',
        success_url: `${origin}/?tab=accueil&checkout=success`,
        cancel_url: `${origin}/?tab=accueil&checkout=cancel`,
        'metadata[agency_id]': agency_id,
        'metadata[plan_key]': plan_key,
        'subscription_data[metadata][agency_id]': agency_id,
        'subscription_data[metadata][plan_key]': plan_key,
      }),
    });
    const session = await sessionRes.json();
    if (!sessionRes.ok) throw new Error(`Stripe session error: ${JSON.stringify(session)}`);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('create-checkout-session error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
