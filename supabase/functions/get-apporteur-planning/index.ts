/**
 * GET APPORTEUR PLANNING
 * 
 * Retourne les RDV de la semaine pour les clients d'un apporteur.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { handleCorsPreflightOrReject, withCors } from '../_shared/cors.ts';

interface PlanningEvent {
  id: number;
  projectId: number;
  projectRef: string;
  clientName: string;
  city: string;
  date: string;
  time: string | null;
  type: string;
  typeLabel: string;
  technicianName: string | null;
}

// deno-lint-ignore no-explicit-any
type AnyRecord = Record<string, any>;

function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  if (dateStr.includes('-')) {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      return isNaN(d.getTime()) ? null : d;
    }
  }
  return null;
}

function getTypeLabel(type: string): string {
  const t = type.toLowerCase();
  if (t.includes('rt') || t.includes('relevé') || t.includes('releve')) return 'Relevé technique';
  if (t.includes('tvx') || t.includes('travaux')) return 'Travaux';
  if (t.includes('depan') || t.includes('dépan')) return 'Dépannage';
  if (t.includes('sav')) return 'SAV';
  return 'Intervention';
}

function getWeekBounds(weekOffset: number = 0): { start: Date; end: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff + (weekOffset * 7));
  monday.setHours(0, 0, 0, 0);
  
  // End on Friday (Lun-Ven only, no Sat/Sun)
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  friday.setHours(23, 59, 59, 999);
  
  return { start: monday, end: friday };
}

Deno.serve(async (req) => {
  const corsResult = handleCorsPreflightOrReject(req);
  if (corsResult) return corsResult;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Non autorisé' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Non autorisé' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Parse request
    const body = await req.json().catch(() => ({}));
    const weekOffset = Number(body.weekOffset || 0);

    const { data: apporteurUser } = await supabase
      .from('apporteur_users')
      .select('id, apporteur_id, agency_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!apporteurUser) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Utilisateur apporteur non trouvé' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const { data: apporteur } = await supabase
      .from('apporteurs')
      .select('id, name, apogee_client_id, agency_id')
      .eq('id', apporteurUser.apporteur_id)
      .single();

    if (!apporteur?.apogee_client_id) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'non_raccorde' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const { data: agency } = await supabase
      .from('apogee_agencies')
      .select('slug')
      .eq('id', apporteur.agency_id)
      .single();

    if (!agency?.slug) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Agence non trouvée' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const apiKey = Deno.env.get('APOGEE_API_KEY');
    if (!apiKey) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Configuration serveur manquante' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const baseUrl = `https://${agency.slug}.hc-apogee.fr/api`;
    const commanditaireId = apporteur.apogee_client_id;
    const weekBounds = getWeekBounds(weekOffset);

    // Helper function for API calls with timeout and error handling
    async function fetchApogee(endpoint: string): Promise<AnyRecord[]> {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout
      
      try {
        const res = await fetch(`${baseUrl}/${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ API_KEY: apiKey }),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!res.ok) {
          console.warn(`[GET-APPORTEUR-PLANNING] ${endpoint} returned ${res.status}`);
          return [];
        }
        
        const text = await res.text();
        if (!text) return [];
        
        try {
          return JSON.parse(text) || [];
        } catch {
          console.warn(`[GET-APPORTEUR-PLANNING] ${endpoint} invalid JSON`);
          return [];
        }
      } catch (err) {
        clearTimeout(timeoutId);
        console.warn(`[GET-APPORTEUR-PLANNING] ${endpoint} failed:`, err instanceof Error ? err.message : err);
        return [];
      }
    }

    const [allProjects, allInterventions, allUsers, allClients] = await Promise.all([
      fetchApogee('apiGetProjects'),
      fetchApogee('apiGetInterventions'),
      fetchApogee('apiGetUsers'),
      fetchApogee('apiGetClients'),
    ]);

    // Build clients map for final client name
    const clientsMap: Record<number, string> = {};
    for (const c of (allClients || []) as AnyRecord[]) {
      clientsMap[c.id] = c.name || 'Client';
    }

    // Build users map
    const usersMap: Record<number, string> = {};
    for (const u of (allUsers || []) as AnyRecord[]) {
      usersMap[u.id] = `${u.firstname || ''} ${u.lastname || ''}`.trim() || 'Technicien';
    }

    // Filter projects by commanditaireId
    const projectIds = new Set<number>();
    const projectsMap: Record<number, AnyRecord> = {};
    
    for (const p of (allProjects || []) as AnyRecord[]) {
      const cmdId = p.data?.commanditaireId;
      if (cmdId === commanditaireId) {
        projectIds.add(Number(p.id));
        projectsMap[Number(p.id)] = p;
      }
    }

    // Filter interventions for the week
    const events: PlanningEvent[] = [];
    
    for (const i of (allInterventions || []) as AnyRecord[]) {
      const projectId = Number(i.projectId);
      if (!projectIds.has(projectId)) continue;

      const intDate = parseDate(i.dateReelle || i.date);
      if (!intDate || intDate < weekBounds.start || intDate > weekBounds.end) continue;

      const project = projectsMap[projectId];
      const clientData = project?.data || {};
      // Use final client name from apiGetClients via project.clientId
      const finalClientId = project?.clientId;
      const clientName = finalClientId ? (clientsMap[finalClientId] || 'Client') : (clientData.locataireName || 'Client');
      const city = clientData.ville || '';

      const type = String(i.type || i.type2 || 'intervention').toLowerCase();
      const time = i.heureDebut || i.heure || null;

      events.push({
        id: Number(i.id),
        projectId,
        projectRef: String(project?.ref || ''),
        clientName,
        city,
        date: intDate.toISOString().split('T')[0],
        time,
        type,
        typeLabel: getTypeLabel(type),
        technicianName: i.userId ? usersMap[i.userId] || null : null,
      });
    }

    // Sort by date and time
    events.sort((a, b) => {
      const dateComp = a.date.localeCompare(b.date);
      if (dateComp !== 0) return dateComp;
      if (a.time && b.time) return a.time.localeCompare(b.time);
      return 0;
    });

    console.log(`[GET-APPORTEUR-PLANNING] ${events.length} events for week offset ${weekOffset}`);

    return withCors(req, new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          events,
          week: {
            start: weekBounds.start.toISOString().split('T')[0],
            end: weekBounds.end.toISOString().split('T')[0],
            offset: weekOffset,
          }
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));

  } catch (error) {
    console.error('[GET-APPORTEUR-PLANNING] Exception:', error instanceof Error ? error.message : error);
    return withCors(req, new Response(
      JSON.stringify({ success: false, error: 'Erreur interne' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
});
