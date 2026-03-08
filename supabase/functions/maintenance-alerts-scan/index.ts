/**
 * Edge Function: maintenance-alerts-scan
 * CRON job quotidien pour scanner les événements de maintenance
 * et générer des alertes automatiques (overdue, upcoming)
 * 
 * SECURITY: Cette fonction utilise verify_jwt=false mais est protégée
 * par un webhook secret obligatoire.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsPreflightOrReject, withCors } from '../_shared/cors.ts';

interface MaintenanceEvent {
  id: string;
  agency_id: string;
  target_type: 'vehicle' | 'tool';
  vehicle_id: string | null;
  tool_id: string | null;
  label: string;
  scheduled_at: string;
  status: 'scheduled' | 'overdue' | 'completed' | 'cancelled';
}

interface MaintenanceAlert {
  id: string;
  maintenance_event_id: string;
  status: 'open' | 'acknowledged' | 'closed';
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResult = handleCorsPreflightOrReject(req);
  if (corsResult) return corsResult;

  // FAIL-CLOSED: webhook secret MUST be provisioned and MUST match
  const webhookSecret = Deno.env.get('MAINTENANCE_WEBHOOK_SECRET');
  const providedSecret = req.headers.get('x-webhook-secret');

  if (!webhookSecret || !providedSecret || providedSecret !== webhookSecret) {
    console.error('[maintenance-alerts-scan] Unauthorized: missing or invalid webhook secret (fail-closed)');
    const response = new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
    return withCors(req, response);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log('[maintenance-alerts-scan] Starting scan...');

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const in7Days = new Date(today);
    in7Days.setDate(today.getDate() + 7);

    const in30Days = new Date(today);
    in30Days.setDate(today.getDate() + 30);

    // 1. Récupérer tous les événements scheduled ou overdue
    const { data: events, error: eventsError } = await supabase
      .from('maintenance_events')
      .select('*')
      .in('status', ['scheduled', 'overdue']);

    if (eventsError) {
      console.error('[maintenance-alerts-scan] Error fetching events:', eventsError);
      const response = new Response(
        JSON.stringify({ success: false, error: eventsError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
      return withCors(req, response);
    }

    if (!events || events.length === 0) {
      console.log('[maintenance-alerts-scan] No events to process');
      const response = new Response(
        JSON.stringify({ success: true, message: 'No events to process', stats: { processed: 0 } }),
        { headers: { 'Content-Type': 'application/json' } }
      );
      return withCors(req, response);
    }

    console.log(`[maintenance-alerts-scan] Found ${events.length} events to check`);

    let overdueCount = 0;
    let alertsCreated = 0;
    let updatedToOverdue = 0;

    for (const ev of events as MaintenanceEvent[]) {
      if (!ev.scheduled_at) continue;

      const scheduled = new Date(ev.scheduled_at);
      scheduled.setHours(0, 0, 0, 0);

      const isOverdue = scheduled < today;
      const isUpcoming7 = scheduled >= today && scheduled <= in7Days;
      const isUpcoming30 = scheduled > in7Days && scheduled <= in30Days;

      // 2. Si l'événement est en retard, mettre à jour son statut
      if (isOverdue && ev.status !== 'overdue') {
        const { error: updateError } = await supabase
          .from('maintenance_events')
          .update({ status: 'overdue' })
          .eq('id', ev.id);

        if (updateError) {
          console.error(`[maintenance-alerts-scan] Error updating event ${ev.id} to overdue:`, updateError);
        } else {
          updatedToOverdue++;
        }
      }

      // 3. Vérifier si une alerte open existe déjà
      const { data: existingAlerts } = await supabase
        .from('maintenance_alerts')
        .select('id')
        .eq('maintenance_event_id', ev.id)
        .eq('status', 'open')
        .limit(1);

      if (existingAlerts && existingAlerts.length > 0) {
        // Alerte déjà existante, skip
        continue;
      }

      // 4. Créer une alerte si nécessaire
      let severity: 'info' | 'warning' | 'critical' | null = null;

      if (isOverdue) {
        overdueCount++;
        // Calculer le retard en jours
        const daysOverdue = Math.floor((today.getTime() - scheduled.getTime()) / (1000 * 60 * 60 * 24));
        severity = daysOverdue > 30 ? 'critical' : 'warning';
      } else if (isUpcoming7) {
        severity = 'warning';
      } else if (isUpcoming30) {
        severity = 'info';
      }

      if (severity) {
        const { error: insertError } = await supabase
          .from('maintenance_alerts')
          .insert({
            agency_id: ev.agency_id,
            maintenance_event_id: ev.id,
            severity,
            status: 'open',
            notified_channels: {},
          });

        if (insertError) {
          console.error(`[maintenance-alerts-scan] Error creating alert for event ${ev.id}:`, insertError);
        } else {
          alertsCreated++;
          console.log(`[maintenance-alerts-scan] Created ${severity} alert for event ${ev.id}`);
        }
      }
    }

    const stats = {
      processed: events.length,
      updatedToOverdue,
      overdueCount,
      alertsCreated,
    };

    console.log('[maintenance-alerts-scan] Scan completed:', stats);

    const response = new Response(
      JSON.stringify({ success: true, stats }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    return withCors(req, response);
  } catch (error) {
    console.error('[maintenance-alerts-scan] Unexpected error:', error);
    const response = new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
    return withCors(req, response);
  }
});
