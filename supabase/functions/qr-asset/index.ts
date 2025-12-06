// supabase/functions/qr-asset/index.ts
// Edge function publique pour récupérer les infos d'un actif via QR token
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      console.log('[qr-asset] Missing token parameter');
      return new Response(
        JSON.stringify({ success: false, error: 'MISSING_TOKEN' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    console.log('[qr-asset] Looking up asset for token:', token.substring(0, 8) + '...');

    // 1. Chercher d'abord un véhicule
    const { data: vehicles, error: vehicleError } = await supabase
      .from('fleet_vehicles')
      .select(
        'id, name, registration, brand, model, status, ct_due_at, next_revision_at, next_tires_change_at, agency_id'
      )
      .eq('qr_token', token)
      .limit(1);

    if (vehicleError) {
      console.error('[qr-asset] vehicleError', vehicleError);
    }

    let type: 'vehicle' | 'tool' | null = null;
    let asset: any = null;

    if (vehicles && vehicles.length === 1) {
      type = 'vehicle';
      asset = vehicles[0];
      console.log('[qr-asset] Found vehicle:', asset.name);
    } else {
      // 2. Sinon, chercher un outil / EPI
      const { data: tools, error: toolsError } = await supabase
        .from('tools')
        .select('id, label, category, serial_number, status, agency_id')
        .eq('qr_token', token)
        .limit(1);

      if (toolsError) {
        console.error('[qr-asset] toolsError', toolsError);
      }

      if (tools && tools.length === 1) {
        type = 'tool';
        asset = tools[0];
        console.log('[qr-asset] Found tool:', asset.label);
      }
    }

    if (!type || !asset) {
      console.log('[qr-asset] No asset found for token');
      return new Response(
        JSON.stringify({ success: false, error: 'NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const agencyId = asset.agency_id;

    // 3. Récupérer les événements liés (prochains + dernier terminé)
    const targetFilter =
      type === 'vehicle'
        ? { column: 'vehicle_id', value: asset.id }
        : { column: 'tool_id', value: asset.id };

    const { data: events, error: eventsError } = await supabase
      .from('maintenance_events')
      .select('id, label, status, scheduled_at, completed_at')
      .eq(targetFilter.column, targetFilter.value)
      .eq('agency_id', agencyId);

    if (eventsError) {
      console.error('[qr-asset] eventsError', eventsError);
    }

    // Filtrer et trier les événements
    const upcomingEvents =
      events
        ?.filter((e) => e.status === 'scheduled' && e.scheduled_at)
        .sort((a, b) => {
          return new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime();
        }) ?? [];

    const completedEvents =
      events
        ?.filter((e) => e.status === 'completed' && e.completed_at)
        .sort((a, b) => {
          return new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime();
        }) ?? [];

    const payload = {
      success: true,
      type,
      asset:
        type === 'vehicle'
          ? {
              id: asset.id,
              name: asset.name,
              registration: asset.registration,
              brand: asset.brand,
              model: asset.model,
              status: asset.status,
              ct_due_at: asset.ct_due_at,
              next_revision_at: asset.next_revision_at,
              next_tires_change_at: asset.next_tires_change_at,
            }
          : {
              id: asset.id,
              name: asset.label,
              category: asset.category,
              serial_number: asset.serial_number,
              status: asset.status,
            },
      upcomingEvents: upcomingEvents.slice(0, 5).map((e) => ({
        id: e.id,
        label: e.label,
        status: e.status,
        scheduled_at: e.scheduled_at,
      })),
      lastCompletedEvent: completedEvents[0]
        ? {
            id: completedEvents[0].id,
            label: completedEvents[0].label,
            status: completedEvents[0].status,
            completed_at: completedEvents[0].completed_at,
          }
        : null,
    };

    console.log('[qr-asset] Returning asset info for', type, asset.name || asset.label);

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[qr-asset] Unhandled error', error);
    return new Response(
      JSON.stringify({ success: false, error: 'INTERNAL_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
