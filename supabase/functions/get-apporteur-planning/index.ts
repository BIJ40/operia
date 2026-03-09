/**
 * GET APPORTEUR PLANNING
 * 
 * Retourne TOUS les RDV à venir pour les clients d'un apporteur.
 * V2 — fix baseUrl + retourne tous les RDV sans limite.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { handleCorsPreflightOrReject, withCors } from '../_shared/cors.ts';
import { authenticateApporteur } from '../_shared/apporteurAuth.ts';

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

function getAllFutureBounds(): { start: Date } {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return { start: now };
}

Deno.serve(async (req) => {
  const corsResult = handleCorsPreflightOrReject(req);
  if (corsResult) return corsResult;

  try {
    // Parse request body first (before auth consumes the stream)
    const body = await req.json().catch(() => ({}));
    // weekOffset ignored now — we return all upcoming events

    // Dual auth: custom apporteur token OR Supabase JWT
    const authResult = await authenticateApporteur(req);
    if (!authResult) {
      console.warn('[GET-APPORTEUR-PLANNING] authenticateApporteur returned null — rejecting request');
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Non autorisé' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const { apogeeClientId: commanditaireId, agencySlug } = authResult;

    const apiKey = Deno.env.get('APOGEE_API_KEY');
    if (!apiKey) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Configuration serveur manquante' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const baseUrl = `https://${agencySlug}.hc-apogee.fr/api`;
    const bounds = getAllFutureBounds();

    function extractApogeeList(endpoint: string, parsed: unknown): AnyRecord[] {
      if (Array.isArray(parsed)) return parsed as AnyRecord[];
      if (!parsed || typeof parsed !== 'object') return [];

      const obj = parsed as AnyRecord;

      const tryPick = (val: unknown): AnyRecord[] | null => {
        if (Array.isArray(val)) return val as AnyRecord[];
        if (!val || typeof val !== 'object') return null;

        const vobj = val as AnyRecord;
        const candidates = [
          vobj.items,
          vobj.Items,
          vobj.clients,
          vobj.Clients,
          vobj.projects,
          vobj.Projects,
          vobj.factures,
          vobj.Factures,
          vobj.devis,
          vobj.Devis,
          vobj.interventions,
          vobj.Interventions,
          vobj.users,
          vobj.Users,
          vobj.results,
          vobj.rows,
          vobj.list,
          vobj.value,
        ];

        for (const c of candidates) {
          if (Array.isArray(c)) return c as AnyRecord[];
        }

        for (const v of Object.values(vobj)) {
          if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object') return v as AnyRecord[];
        }

        return null;
      };

      const picked =
        tryPick(obj.data) ||
        tryPick(obj.Data) ||
        tryPick(obj.result) ||
        tryPick(obj.results) ||
        tryPick(obj);

      if (!picked) {
        console.warn(`[GET-APPORTEUR-PLANNING] ${endpoint} unexpected response shape`, {
          keys: Object.keys(obj),
          dataKeys: obj.data && typeof obj.data === 'object' ? Object.keys(obj.data) : null,
        });
        return [];
      }

      return picked;
    }

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
          const parsed = JSON.parse(text);
          return extractApogeeList(endpoint, parsed);
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

    // Build clients map (project.clientId -> "CLIENT (propriétaire)")
    const clientsMap: Record<string, string> = {};
    for (const c of (allClients || []) as AnyRecord[]) {
      const clientIdRaw = c.id ?? c.ID ?? c.clientId ?? c.client_id;
      const clientId = clientIdRaw != null ? String(clientIdRaw) : '';

      const dataObj = c.data as AnyRecord | undefined;
      const clientNameRaw = c.nom ?? c.name ?? c.Nom ?? c.libelle ?? c.label;
      const ownerNameRaw = dataObj?.proprietaire;

      const clientName = typeof clientNameRaw === 'string' ? clientNameRaw.trim() : '';
      const ownerName = typeof ownerNameRaw === 'string' ? ownerNameRaw.trim() : '';

      let display = clientName || ownerName;
      if (clientName && ownerName && ownerName.toLowerCase() !== clientName.toLowerCase()) {
        display = `${clientName} (${ownerName})`;
      }

      if (clientId && display) clientsMap[clientId] = display;
    }
    console.log(`[GET-APPORTEUR-PLANNING] Built clientsMap with ${Object.keys(clientsMap).length} entries`);

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
      if (cmdId != null && String(cmdId) === String(commanditaireId)) {
        projectIds.add(Number(p.id));
        projectsMap[Number(p.id)] = p;
      }
    }

    // Filter interventions for the week
    const events: PlanningEvent[] = [];
    
    let loggedSample = false;
    for (const i of (allInterventions || []) as AnyRecord[]) {
      const projectId = Number(i.projectId);
      if (!projectIds.has(projectId)) continue;

      // Log first matching intervention to discover available fields
      if (!loggedSample) {
        loggedSample = true;
        console.log(`[GET-APPORTEUR-PLANNING] Sample intervention keys:`, Object.keys(i));
        const iData = (i.data && typeof i.data === 'object') ? i.data as Record<string, unknown> : {};
        console.log(`[GET-APPORTEUR-PLANNING] Sample i.data keys:`, Object.keys(iData));
        // Log all time-related fields
        const timeFields: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(iData)) {
          const kl = k.toLowerCase();
          if (kl.includes('heur') || kl.includes('time') || kl.includes('creneau') || kl.includes('slot') || kl.includes('demi') || kl.includes('matin') || kl.includes('midi') || kl.includes('period') || kl.includes('visite')) {
            timeFields[k] = typeof v === 'object' ? JSON.stringify(v)?.substring(0, 200) : v;
          }
        }
        console.log(`[GET-APPORTEUR-PLANNING] Time-related data fields:`, timeFields);
        // Also check visites
        if (Array.isArray(iData.visites) && iData.visites.length > 0) {
          console.log(`[GET-APPORTEUR-PLANNING] First visite:`, JSON.stringify(iData.visites[0]).substring(0, 500));
        }
      }

      const intDate = parseDate(i.dateReelle || i.date);
      if (!intDate || intDate < bounds.start) continue;

      const project = projectsMap[projectId];
      const clientData = project?.data || {};

      const finalClientId = project?.clientId != null ? String(project.clientId) : null;
      const candidateNames = [finalClientId ? clientsMap[finalClientId] : null]
        .map((v) => (typeof v === 'string' ? v.trim() : ''))
        .filter((v) => v && v.toLowerCase() !== 'client');

      const clientName = candidateNames[0] || 'Client inconnu';
      const city = clientData.ville || '';

      const type = String(i.type || i.type2 || 'intervention').toLowerCase();
      
      // Extract time: try data.heureDebut, then visites[0].date (datetime), then top-level fields
      const iData = (i.data && typeof i.data === 'object') ? i.data as Record<string, unknown> : {};
      let rawTime: unknown = iData.heureDebut ?? iData.heure ?? iData.heureRdv ?? null;
      
      // Try extracting hour from visites datetime (e.g. "2026-03-10T14:00:00")
      if (rawTime == null && Array.isArray(iData.visites) && iData.visites.length > 0) {
        const vDate = String((iData.visites[0] as Record<string, unknown>)?.date || '');
        const tMatch = vDate.match(/T(\d{2}:\d{2})/);
        if (tMatch) rawTime = tMatch[1];
      }
      
      // Try top-level date field with time component
      if (rawTime == null) {
        const topDate = String(i.date || '');
        const tMatch = topDate.match(/T(\d{2}:\d{2})/);
        if (tMatch) rawTime = tMatch[1];
      }
      
      const time = rawTime != null ? String(rawTime) : null;

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

    console.log(`[GET-APPORTEUR-PLANNING] ${events.length} upcoming events, times:`, events.map(e => ({ id: e.id, time: e.time, date: e.date })));

    return withCors(req, new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          events,
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
