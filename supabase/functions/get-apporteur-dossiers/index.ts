/**
 * GET APPORTEUR DOSSIERS
 * 
 * Retourne la liste complète des dossiers pour un apporteur avec état d'avancement détaillé.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { handleCorsPreflightOrReject, withCors } from '../_shared/cors.ts';

interface DossierRow {
  id: number;
  ref: string;
  clientName: string;
  address: string;
  city: string;
  status: string;
  statusLabel: string;
  dateCreation: string | null;
  datePremierRdv: string | null;
  dateDevisEnvoye: string | null;
  dateDevisValide: string | null;
  dateRdvTravaux: string | null;
  dateFacture: string | null;
  dateReglement: string | null;
  lastModified: string | null; // Date de dernière modification (toute action)
  devisHT: number;
  factureHT: number;
  restedu: number;
  devisId: number | null;
  factureId: number | null;
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

function formatDateISO(date: Date | null): string | null {
  if (!date) return null;
  return date.toISOString().split('T')[0];
}

function getStatusFromProject(project: AnyRecord, facture: AnyRecord | null, devis: AnyRecord | null): { status: string; label: string } {
  const state = String(project.state || '').toLowerCase();
  
  if (facture) {
    const resteDu = Number(facture.data?.calcReglementsReste || facture.calcReglementsReste || 0);
    if (resteDu <= 0) {
      return { status: 'regle', label: 'Réglé' };
    }
    return { status: 'attente_paiement', label: 'Attente paiement' };
  }
  
  if (['invoiced', 'facturé', 'facture'].some(s => state.includes(s))) {
    return { status: 'facture', label: 'Facturé' };
  }
  
  if (devis) {
    const devisState = String(devis.state || '').toLowerCase();
    if (['validated', 'signed', 'order', 'accepted', 'validé', 'signé'].some(s => devisState.includes(s))) {
      return { status: 'devis_valide', label: 'Devis validé' };
    }
    if (['sent', 'envoyé', 'envoye'].some(s => devisState.includes(s))) {
      return { status: 'devis_envoye', label: 'Devis envoyé' };
    }
    return { status: 'devis_en_cours', label: 'Devis en cours' };
  }
  
  if (['rdv_tvx', 'rdv travaux', 'travaux planifié'].some(s => state.includes(s))) {
    return { status: 'rdv_travaux', label: 'RDV Travaux' };
  }
  
  if (['planifié', 'planned', 'programmé'].some(s => state.includes(s))) {
    return { status: 'programme', label: 'Programmé 1er RDV' };
  }
  
  if (['clos', 'closed', 'terminé', 'done'].some(s => state.includes(s))) {
    return { status: 'clos', label: 'Clos' };
  }
  
  return { status: 'en_cours', label: 'En cours' };
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
          console.warn(`[GET-APPORTEUR-DOSSIERS] ${endpoint} returned ${res.status}`);
          return [];
        }
        
        // Read body as text first to handle connection drops gracefully
        const text = await res.text();
        if (!text) return [];
        
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) return parsed;

          if (parsed && typeof parsed === 'object') {
            const obj = parsed as AnyRecord;

            const data = obj.data;
            if (Array.isArray(data)) return data;
            if (data && typeof data === 'object') {
              const dataObj = data as AnyRecord;
              if (Array.isArray(dataObj.items)) return dataObj.items;
              if (Array.isArray(dataObj.Items)) return dataObj.Items;
              if (Array.isArray(dataObj.clients)) return dataObj.clients;
            }

            if (Array.isArray(obj.items)) return obj.items;
            if (Array.isArray(obj.Items)) return obj.Items;
          }

          return [];
        } catch {
          console.warn(`[GET-APPORTEUR-DOSSIERS] ${endpoint} invalid JSON`);
          return [];
        }
      } catch (err) {
        clearTimeout(timeoutId);
        console.warn(`[GET-APPORTEUR-DOSSIERS] ${endpoint} failed:`, err instanceof Error ? err.message : err);
        return [];
      }
    }

    const [allProjects, allFactures, allDevis, allInterventions, allClients] = await Promise.all([
      fetchApogee('apiGetProjects'),
      fetchApogee('apiGetFactures'),
      fetchApogee('apiGetDevis'),
      fetchApogee('apiGetInterventions'),
      fetchApogee('apiGetClients'),
    ]);

    // Build clients map for final client name
    const clientsMap: Record<number, string> = {};
    for (const c of (allClients || []) as AnyRecord[]) {
      const clientId = Number(c.id);
      if (clientId && c.name) {
        clientsMap[clientId] = String(c.name);
      }
    }
    console.log(`[GET-APPORTEUR-DOSSIERS] Built clientsMap with ${Object.keys(clientsMap).length} entries`);

    const projects = (allProjects || []).filter((p: AnyRecord) => {
      const cmdId = p.data?.commanditaireId;
      return cmdId === commanditaireId;
    });

    const facturesByProject: Record<number, AnyRecord> = {};
    const devisByProject: Record<number, AnyRecord> = {};
    const interventionsByProject: Record<number, AnyRecord[]> = {};

    for (const f of (allFactures || []) as AnyRecord[]) {
      if (f.projectId) {
        const existing = facturesByProject[f.projectId];
        const newDate = parseDate(f.dateReelle || f.date);
        const existingDate = existing ? parseDate(existing.dateReelle || existing.date) : null;
        if (!existing || (newDate && existingDate && newDate > existingDate)) {
          facturesByProject[f.projectId] = f;
        }
      }
    }

    for (const d of (allDevis || []) as AnyRecord[]) {
      if (d.projectId) {
        const existing = devisByProject[d.projectId];
        const newDate = parseDate(d.dateReelle || d.date);
        const existingDate = existing ? parseDate(existing.dateReelle || existing.date) : null;
        if (!existing || (newDate && existingDate && newDate > existingDate)) {
          devisByProject[d.projectId] = d;
        }
      }
    }

    for (const i of (allInterventions || []) as AnyRecord[]) {
      if (i.projectId) {
        if (!interventionsByProject[i.projectId]) {
          interventionsByProject[i.projectId] = [];
        }
        interventionsByProject[i.projectId].push(i);
      }
    }

    const dossiers: DossierRow[] = [];
    let totalResteDu = 0;

    for (const p of projects) {
      const projectId = Number(p.id);
      const facture = facturesByProject[projectId] || null;
      const devis = devisByProject[projectId] || null;
      const interventions = interventionsByProject[projectId] || [];

      const clientData = p.data || {};
      // Nom du client final : privilégier les champs "terrain" (locataire/clientName)
      // puis fallback sur projet/clientId.
      const finalClientId = p.clientId ? Number(p.clientId) : null;
      const candidateNames = [
        clientData.locataireName,
        clientData.clientName,
        p.client?.name,
        finalClientId ? clientsMap[finalClientId] : null,
        p.client?.id ? clientsMap[Number(p.client.id)] : null,
      ]
        .map((v) => (typeof v === 'string' ? v.trim() : ''))
        .filter((v) => v && v.toLowerCase() !== 'client');

      const clientName = candidateNames[0] || 'Client inconnu';
      const city = clientData.ville || '';

      const projectDate = parseDate(p.dateReelle || p.date);
      
      let premierRdv: Date | null = null;
      for (const i of interventions) {
        const intDate = parseDate(i.dateReelle || i.date);
        if (intDate && (!premierRdv || intDate < premierRdv)) {
          premierRdv = intDate;
        }
      }

      let rdvTravaux: Date | null = null;
      for (const i of interventions) {
        const type = String(i.type || i.type2 || '').toLowerCase();
        if (['travaux', 'tvx', 'work'].some(t => type.includes(t))) {
          const intDate = parseDate(i.dateReelle || i.date);
          if (intDate && (!rdvTravaux || intDate > rdvTravaux)) {
            rdvTravaux = intDate;
          }
        }
      }

      const devisDate = devis ? parseDate(devis.dateReelle || devis.date) : null;
      const devisState = devis ? String(devis.state || '').toLowerCase() : '';
      const devisValide = ['validated', 'signed', 'order', 'accepted'].some(s => devisState.includes(s));

      const factureDate = facture ? parseDate(facture.dateReelle || facture.date) : null;
      
      let dateReglement: Date | null = null;
      if (facture) {
        const resteDu = Number(facture.data?.calcReglementsReste || facture.calcReglementsReste || 0);
        if (resteDu <= 0 && factureDate) {
          dateReglement = factureDate;
        }
      }

      const devisHT = devis ? Number(devis.totalHT || devis.data?.totalHT || 0) : 0;
      const factureHT = facture ? Number(facture.data?.totalHT || facture.totalHT || 0) : 0;
      const resteDuTTC = facture ? Number(facture.data?.calcReglementsReste || facture.calcReglementsReste || 0) : 0;
      const totalTTC = facture ? Number(facture.data?.totalTTC || facture.totalTTC || 0) : 0;
      const ratioHT = totalTTC > 0 ? factureHT / totalTTC : 1;
      const resteDuHT = resteDuTTC * ratioHT;

      totalResteDu += Math.max(0, resteDuHT);

      const { status, label } = getStatusFromProject(p, facture, devis);

      // Compute lastModified = most recent date across all actions
      const allDates = [projectDate, premierRdv, devisDate, rdvTravaux, factureDate, dateReglement].filter(Boolean) as Date[];
      const lastModified = allDates.length > 0 ? allDates.reduce((a, b) => a > b ? a : b) : projectDate;

      dossiers.push({
        id: projectId,
        ref: String(p.ref || ''),
        clientName,
        address: '***',
        city,
        status,
        statusLabel: label,
        dateCreation: formatDateISO(projectDate),
        datePremierRdv: formatDateISO(premierRdv),
        dateDevisEnvoye: devis && !devisValide ? formatDateISO(devisDate) : null,
        dateDevisValide: devisValide ? formatDateISO(devisDate) : null,
        dateRdvTravaux: formatDateISO(rdvTravaux),
        dateFacture: formatDateISO(factureDate),
        dateReglement: formatDateISO(dateReglement),
        lastModified: formatDateISO(lastModified),
        devisHT: Math.round(devisHT * 100) / 100,
        factureHT: Math.round(factureHT * 100) / 100,
        restedu: Math.round(Math.max(0, resteDuHT) * 100) / 100,
        devisId: devis ? Number(devis.id) : null,
        factureId: facture ? Number(facture.id) : null,
      });
    }

    // Sort by lastModified descending (most recent first)
    dossiers.sort((a, b) => {
      const dateA = a.lastModified ? new Date(a.lastModified).getTime() : 0;
      const dateB = b.lastModified ? new Date(b.lastModified).getTime() : 0;
      return dateB - dateA;
    });

    console.log(`[GET-APPORTEUR-DOSSIERS] ${dossiers.length} dossiers for commanditaireId ${commanditaireId}`);

    return withCors(req, new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          dossiers,
          totals: {
            count: dossiers.length,
            resteDu: Math.round(totalResteDu * 100) / 100,
          }
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('[GET-APPORTEUR-DOSSIERS] Exception:', errorMsg);
    console.error('[GET-APPORTEUR-DOSSIERS] Stack:', errorStack);
    return withCors(req, new Response(
      JSON.stringify({ success: false, error: 'Erreur interne', detail: errorMsg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
});
