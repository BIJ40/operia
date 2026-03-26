/**
 * GET APPORTEUR DOSSIERS
 * 
 * Retourne la liste complète des dossiers pour un apporteur avec état d'avancement détaillé.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { handleCorsPreflightOrReject, withCors } from '../_shared/cors.ts';
import { authenticateApporteur } from '../_shared/apporteurAuth.ts';

interface DossierRow {
  id: number;
  ref: string;
  clientName: string;
  address: string;
  city: string;
  status: string;
  statusLabel: string;
  rawState: string;
  dateCreation: string | null;
  datePremierRdv: string | null;
  dateDevisEnvoye: string | null;
  dateDevisValide: string | null;
  dateRdvTravaux: string | null;
  dateFacture: string | null;
  dateReglement: string | null;
  lastModified: string | null;
  devisHT: number;
  factureHT: number;
  factureTTC: number;
  restedu: number;
  resteduTTC: number;
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

function isCancelledLike(stateRaw: unknown): boolean {
  const s = String(stateRaw ?? '').toLowerCase();
  return ['cancelled', 'canceled', 'cancel', 'annul', 'abandon', 'refus', 'refuse', 'refused'].some((k) => s.includes(k));
}

function getStatusFromProject(project: AnyRecord, facture: AnyRecord | null, devis: AnyRecord | null): { status: string; label: string } {
  const rawProjectState = project.state ?? project.data?.state;
  const state = String(rawProjectState || '').toLowerCase();

  // PRIORITÉ 1: Statut du dossier annulé prime sur tout
  if (isCancelledLike(state)) {
    return { status: 'annule', label: 'Annulé' };
  }

  // PRIORITÉ 2: Dossier clos
  if (['clos', 'closed', 'terminé', 'done'].some((s) => state.includes(s))) {
    return { status: 'clos', label: 'Clos' };
  }

  // PRIORITÉ 3: Facture existante
  if (facture) {
    const resteDu = Number(facture.data?.calcReglementsReste || facture.calcReglementsReste || 0);
    if (resteDu <= 0) {
      return { status: 'clos', label: 'Clos' };
    }
    return { status: 'attente_paiement', label: 'Attente paiement' };
  }

  if (['invoiced', 'facturé', 'facture'].some((s) => state.includes(s))) {
    return { status: 'facture', label: 'Facturé' };
  }

  // PRIORITÉ 4: Devis (on ignore les devis annulés/refusés)
  if (devis) {
    const rawDevisState = devis.state ?? devis.data?.state ?? devis.status;
    const devisState = String(rawDevisState || '').toLowerCase();

    if (!isCancelledLike(devisState)) {
      if (['validated', 'signed', 'order', 'accepted', 'validé', 'signé'].some((s) => devisState.includes(s))) {
        return { status: 'devis_valide', label: 'Devis validé' };
      }
      if (['sent', 'envoyé', 'envoye'].some((s) => devisState.includes(s))) {
        return { status: 'devis_envoye', label: 'Devis envoyé' };
      }
      return { status: 'devis_en_cours', label: 'Devis en cours' };
    }
  }

  // PRIORITÉ 5: Stand-by / en attente
  if (['stand_by', 'standby', 'stand by', 'en attente', 'attente', 'suspendu'].some((s) => state.includes(s))) {
    return { status: 'stand_by', label: 'Stand-by' };
  }

  // PRIORITÉ 6: États intermédiaires
  if (['rdv_tvx', 'rdv travaux', 'travaux planifié'].some((s) => state.includes(s))) {
    return { status: 'rdv_travaux', label: 'RDV Travaux' };
  }

  if (['planifié', 'planned', 'programmé'].some((s) => state.includes(s))) {
    return { status: 'programme', label: 'Programmé 1er RDV' };
  }

  return { status: 'en_cours', label: 'En cours' };
}

Deno.serve(async (req) => {
  const corsResult = handleCorsPreflightOrReject(req);
  if (corsResult) return corsResult;

  try {
    // Dual auth: custom apporteur token OR Supabase JWT
    const authResult = await authenticateApporteur(req);
    if (!authResult) {
      console.warn('[GET-APPORTEUR-DOSSIERS] authenticateApporteur returned null — rejecting request');
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Non autorisé' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const { apporteurId, agencyId, apogeeClientId: commanditaireId, agencySlug } = authResult;

    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch pending requests to auto-link with dossiers
    const { data: pendingRequests } = await supabaseService
      .from('apporteur_intervention_requests')
      .select('id, reference')
      .eq('apporteur_id', apporteurId)
      .is('apogee_project_id', null)
      .not('reference', 'is', null);

    const apiKey = Deno.env.get('APOGEE_API_KEY');
    if (!apiKey) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Configuration serveur manquante' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const baseUrl = `https://${agencySlug}.hc-apogee.fr/api`;

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

        // fallback: first array-valued property with objects
        for (const v of Object.values(vobj)) {
          if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object') return v as AnyRecord[];
        }

        return null;
      };

      // common wrappers
      const picked =
        tryPick(obj.data) ||
        tryPick(obj.Data) ||
        tryPick(obj.result) ||
        tryPick(obj.results) ||
        tryPick(obj);

      if (!picked) {
        console.warn(`[GET-APPORTEUR-DOSSIERS] ${endpoint} unexpected response shape`, {
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
          console.warn(`[GET-APPORTEUR-DOSSIERS] ${endpoint} returned ${res.status}`);
          return [];
        }

        const text = await res.text();
        if (!text) return [];

        try {
          const parsed = JSON.parse(text);
          return extractApogeeList(endpoint, parsed);
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
    console.log(`[GET-APPORTEUR-DOSSIERS] Built clientsMap with ${Object.keys(clientsMap).length} entries`);
    console.log(`[GET-APPORTEUR-DOSSIERS] Looking for commanditaireId=${commanditaireId} (type: ${typeof commanditaireId}), total projects: ${allProjects.length}`);
    
    // Debug: log first few commanditaireIds found
    const sampleCmdIds = allProjects.slice(0, 5).map((p: AnyRecord) => ({ id: p.id, cmdId: p.data?.commanditaireId, type: typeof p.data?.commanditaireId }));
    console.log(`[GET-APPORTEUR-DOSSIERS] Sample commanditaireIds:`, JSON.stringify(sampleCmdIds));

    const projects = (allProjects || []).filter((p: AnyRecord) => {
      const cmdId = p.data?.commanditaireId;
      // Compare loosely: API may return number or string
      return cmdId != null && String(cmdId) === String(commanditaireId);
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
        const rawDevisState = d.state ?? d.data?.state ?? d.status;
        // Ne jamais prendre un devis annulé/refusé pour déterminer l'avancement
        if (isCancelledLike(rawDevisState)) continue;

        const existing = devisByProject[d.projectId];
        const newDate = parseDate(d.dateReelle || d.date);
        const existingDate = existing ? parseDate(existing.dateReelle || existing.date) : null;
        if (!existing || (newDate && (!existingDate || newDate > existingDate))) {
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
      // Nom du client final : project.clientId -> apiGetClients
      const finalClientId = p.clientId != null ? String(p.clientId) : null;
      const candidateNames = [
        finalClientId ? clientsMap[finalClientId] : null,
      ]
        .map((v) => (typeof v === 'string' ? v.trim() : ''))
        .filter((v) => v && v.toLowerCase() !== 'client');

      const clientName = candidateNames[0] || 'Client inconnu';
      const city = clientData.ville || clientData.city || '';
      const address = clientData.adresse || clientData.address || clientData.adr || '';

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

      const rawDevisState = devis ? (devis.state ?? devis.data?.state ?? devis.status) : '';
      const devisState = String(rawDevisState || '').toLowerCase();
      const devisIsCancelled = devis ? isCancelledLike(devisState) : false;
      const devisDate = devis && !devisIsCancelled ? parseDate(devis.dateReelle || devis.date) : null;
      const devisValide = !devisIsCancelled && ['validated', 'signed', 'order', 'accepted'].some(s => devisState.includes(s));

      const factureDate = facture ? parseDate(facture.dateReelle || facture.date) : null;
      
      let dateReglement: Date | null = null;
      if (facture) {
        const resteDu = Number(facture.data?.calcReglementsReste || facture.calcReglementsReste || 0);
        if (resteDu <= 0 && factureDate) {
          dateReglement = factureDate;
        }
      }

      const devisHT = devis && !devisIsCancelled ? Number(devis.totalHT || devis.data?.totalHT || 0) : 0;
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

      // ── V2 enrichment ─────────────────────────────────
      // Universes
      const universes: string[] = (p.data?.universes || []).map((u: unknown) =>
        typeof u === 'string' ? u : ((u as R)?.code || (u as R)?.label || String(u))
      );

      // Triple status
      const devisState2 = devis ? String(devis.state ?? devis.data?.state ?? devis.status ?? '').toLowerCase() : '';
      let devisStatusV2: string = 'aucun';
      if (devis && !devisIsCancelled) {
        if (devisValide) devisStatusV2 = 'valide';
        else if (['refused', 'refusé', 'refuse'].some(s => devisState2.includes(s))) devisStatusV2 = 'refuse';
        else if (['sent', 'envoyé', 'envoye'].some(s => devisState2.includes(s))) devisStatusV2 = 'envoye';
        else devisStatusV2 = 'en_cours';
      } else if (devis && devisIsCancelled) {
        devisStatusV2 = 'annule';
      }

      let factureStatusV2: string = 'non_facture';
      if (facture) {
        const fResteDu = Number(facture.data?.calcReglementsReste || facture.calcReglementsReste || 0);
        if (fResteDu <= 0) factureStatusV2 = 'reglee';
        else if (factureHT > 0 && resteDuHT < factureHT) factureStatusV2 = 'partiellement_reglee';
        else factureStatusV2 = 'emise';
      }

      // Stepper (6 étapes)
      const stepperCompleted: string[] = ['created'];
      if (premierRdv) stepperCompleted.push('rdv_planned');
      if (devisDate && !devisIsCancelled) stepperCompleted.push('devis_sent');
      if (devisValide) stepperCompleted.push('devis_validated');
      if (factureDate) stepperCompleted.push('invoice_sent');
      if (dateReglement) stepperCompleted.push('invoice_paid');

      const v2 = {
        universes,
        status: {
          dossier: status,
          devis: devisStatusV2,
          facture: factureStatusV2,
        },
        amounts: {
          devis_ht: Math.round(devisHT * 100) / 100,
          facture_ht: Math.round(factureHT * 100) / 100,
          reste_du: Math.round(Math.max(0, resteDuHT) * 100) / 100,
        },
        dates: {
          created_at: formatDateISO(projectDate),
          first_rdv_at: formatDateISO(premierRdv),
          devis_sent_at: devis && !devisIsCancelled ? formatDateISO(devisDate) : null,
          devis_validated_at: devisValide ? formatDateISO(devisDate) : null,
          invoice_sent_at: formatDateISO(factureDate),
          invoice_paid_at: formatDateISO(dateReglement),
          last_activity_at: lastModified ? lastModified.toISOString() : null,
        },
        stepper: {
          status: stepperCompleted[stepperCompleted.length - 1],
          completed: stepperCompleted,
        },
      };

      dossiers.push({
        id: projectId,
        ref: String(p.ref || ''),
        clientName,
        address,
        city,
        status,
        statusLabel: label,
        rawState: String(p.state ?? p.data?.state ?? '').trim(),
        dateCreation: formatDateISO(projectDate),
        datePremierRdv: formatDateISO(premierRdv),
        dateDevisEnvoye: devis && !devisValide && !devisIsCancelled ? formatDateISO(devisDate) : null,
        dateDevisValide: devisValide ? formatDateISO(devisDate) : null,
        dateRdvTravaux: formatDateISO(rdvTravaux),
        dateFacture: formatDateISO(factureDate),
        dateReglement: formatDateISO(dateReglement),
        lastModified: formatDateISO(lastModified),
        devisHT: Math.round(devisHT * 100) / 100,
        factureHT: Math.round(factureHT * 100) / 100,
        factureTTC: Math.round(totalTTC * 100) / 100,
        restedu: Math.round(Math.max(0, resteDuHT) * 100) / 100,
        resteduTTC: Math.round(Math.max(0, resteDuTTC) * 100) / 100,
        devisId: devis && !devisIsCancelled ? Number(devis.id) : null,
        factureId: facture ? Number(facture.id) : null,
        v2,
      });
    }

    // Sort by lastModified descending (most recent first)
    dossiers.sort((a, b) => {
      const dateA = a.lastModified ? new Date(a.lastModified).getTime() : 0;
      const dateB = b.lastModified ? new Date(b.lastModified).getTime() : 0;
      return dateB - dateA;
    });

    console.log(`[GET-APPORTEUR-DOSSIERS] ${dossiers.length} dossiers for commanditaireId ${commanditaireId}`);

    // Auto-link: match dossiers to pending requests by reference
    if (pendingRequests && pendingRequests.length > 0) {
      const requestRefMap: Record<string, string> = {};
      for (const req of pendingRequests) {
        if (req.reference) {
          // Normalize: remove leading zeros, spaces, etc.
          const normalized = req.reference.trim().toUpperCase();
          requestRefMap[normalized] = req.id;
        }
      }

      const updates: Array<{ requestId: string; projectId: number }> = [];
      
      for (const dossier of dossiers) {
        if (dossier.ref) {
          // Check if dossier ref contains a request reference
          const normalizedRef = dossier.ref.trim().toUpperCase();
          
          // Direct match
          if (requestRefMap[normalizedRef]) {
            updates.push({ requestId: requestRefMap[normalizedRef], projectId: dossier.id });
            continue;
          }
          
          // Check if any request reference is contained in the dossier ref
          for (const [refKey, reqId] of Object.entries(requestRefMap)) {
            if (normalizedRef.includes(refKey) || refKey.includes(normalizedRef)) {
              updates.push({ requestId: reqId, projectId: dossier.id });
              break;
            }
          }
        }
      }

      // Update matched requests
      if (updates.length > 0) {
        console.log(`[GET-APPORTEUR-DOSSIERS] Auto-linking ${updates.length} request(s) to dossiers`);
        for (const upd of updates) {
          await supabaseService
            .from('apporteur_intervention_requests')
            .update({ 
              apogee_project_id: upd.projectId,
              status: 'in_progress'
            })
            .eq('id', upd.requestId);
        }
      }
    }

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
