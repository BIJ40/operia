import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

serve(async (req) => {
  try {
    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')?.replace(/[^\x20-\x7E]/g, '');
    if (!STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not configured');

    const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    const body = await req.text();
    const sig = req.headers.get('stripe-signature');

    // Verify webhook signature if secret is configured
    // For now, we parse the event directly (add HMAC verification in production)
    const event = JSON.parse(body);
    console.log(`Stripe webhook event: ${event.type}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const agencyId = session.metadata?.agency_id;
        const planKey = session.metadata?.plan_key;
        const subscriptionId = session.subscription;
        const customerId = session.customer;

        if (agencyId && planKey && subscriptionId) {
          await supabase.from('user_subscriptions').upsert({
            agency_id: agencyId,
            plan_key: planKey,
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: customerId,
            status: 'active',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'agency_id,plan_key' });
          console.log(`Subscription activated: ${planKey} for agency ${agencyId}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const agencyId = subscription.metadata?.agency_id;
        const planKey = subscription.metadata?.plan_key;

        if (agencyId && planKey) {
          const status = subscription.status === 'active' ? 'active'
            : subscription.status === 'past_due' ? 'past_due'
            : subscription.status === 'canceled' ? 'canceled'
            : 'inactive';

          await supabase.from('user_subscriptions').upsert({
            agency_id: agencyId,
            plan_key: planKey,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer,
            status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'agency_id,plan_key' });
          console.log(`Subscription updated: ${planKey} → ${status}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const agencyId = subscription.metadata?.agency_id;
        const planKey = subscription.metadata?.plan_key;

        if (agencyId && planKey) {
          await supabase.from('user_subscriptions').upsert({
            agency_id: agencyId,
            plan_key: planKey,
            stripe_subscription_id: subscription.id,
            status: 'canceled',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'agency_id,plan_key' });
          console.log(`Subscription canceled: ${planKey} for agency ${agencyId}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
