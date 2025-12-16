/**
 * GET APPORTEUR STATS
 * 
 * Retourne les KPIs agrégés pour un apporteur raccordé à Apogée.
 * Ne retourne JAMAIS de données brutes (projets, factures, devis).
 * 
 * Sécurité:
 * - JWT obligatoire
 * - Utilisateur doit être un apporteur actif
 * - Données agrégées uniquement
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { handleCorsPreflightOrReject, withCors } from '../_shared/cors.ts';

interface StatsRequest {
  period?: 'month' | 'quarter' | 'year';
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
}

interface ApporteurStats {
  period: { from: string; to: string };
  projects: {
    total: number;
    open: number;
    closed: number;
  };
  devis: {
    total: number;
    accepted: number;
    amount_ht: number;
    conversion_rate: number;
  };
  factures: {
    total: number;
    amount_ht: number;
    paid_ht: number;
    due_ht: number;
  };
  demands: {
    total: number;
    pending: number;
    completed: number;
  };
}

function getDateRange(period?: string, from?: string, to?: string): { start: Date; end: Date } {
  const now = new Date();
  let start: Date;
  let end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  if (from && to) {
    start = new Date(from);
    end = new Date(to);
    end.setHours(23, 59, 59);
  } else {
    switch (period) {
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'month':
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    }
  }

  return { start, end };
}

function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  
  // ISO format
  if (dateStr.includes('-')) {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }
  
  // DD/MM/YYYY format
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      return isNaN(d.getTime()) ? null : d;
    }
  }
  
  return null;
}

Deno.serve(async (req) => {
  // CORS preflight
  const corsResult = handleCorsPreflightOrReject(req);
  if (corsResult) return corsResult;

  try {
    // 1. Vérifier l'authentification
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

    // 2. Vérifier que l'utilisateur est un apporteur actif
    const { data: apporteurUser, error: apporteurUserError } = await supabase
      .from('apporteur_users')
      .select('id, apporteur_id, agency_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (apporteurUserError || !apporteurUser) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Utilisateur apporteur non trouvé' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // 3. Récupérer l'apporteur et son apogee_client_id
    const { data: apporteur, error: apporteurError } = await supabase
      .from('apporteurs')
      .select('id, name, apogee_client_id, agency_id')
      .eq('id', apporteurUser.apporteur_id)
      .single();

    if (apporteurError || !apporteur) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Apporteur non trouvé' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    if (!apporteur.apogee_client_id) {
      return withCors(req, new Response(
        JSON.stringify({ 
          success: false, 
          error: 'non_raccorde',
          message: 'Cet apporteur n\'est pas encore raccordé à Apogée. Contactez l\'agence.'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // 4. Récupérer l'agencySlug
    const { data: agency, error: agencyError } = await supabase
      .from('apogee_agencies')
      .select('slug')
      .eq('id', apporteur.agency_id)
      .single();

    if (agencyError || !agency?.slug) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Agence non trouvée' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // 5. Parser la requête
    const body: StatsRequest = await req.json().catch(() => ({}));
    const { period, from, to } = body;
    const dateRange = getDateRange(period, from, to);

    // 6. Appeler Apogée pour récupérer les données
    const apiKey = Deno.env.get('APOGEE_API_KEY');
    if (!apiKey) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Configuration serveur manquante' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const baseUrl = `https://${agency.slug}.hc-apogee.fr/api`;
    const commanditaireId = apporteur.apogee_client_id;

    // Fetch projects, factures, devis en parallèle
    const [projectsRes, facturesRes, devisRes] = await Promise.all([
      fetch(`${baseUrl}/apiGetProjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ API_KEY: apiKey }),
      }),
      fetch(`${baseUrl}/apiGetFactures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ API_KEY: apiKey }),
      }),
      fetch(`${baseUrl}/apiGetDevis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ API_KEY: apiKey }),
      }),
    ]);

    if (!projectsRes.ok || !facturesRes.ok || !devisRes.ok) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Erreur API Apogée' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const [allProjects, allFactures, allDevis] = await Promise.all([
      projectsRes.json(),
      facturesRes.json(),
      devisRes.json(),
    ]);

    // 7. Filtrer par commanditaireId
    const projects = (allProjects || []).filter((p: Record<string, unknown>) => {
      const cmdId = p.data && typeof p.data === 'object' 
        ? (p.data as Record<string, unknown>).commanditaireId 
        : null;
      return cmdId === commanditaireId;
    });

    const projectIds = new Set(projects.map((p: Record<string, unknown>) => p.id));

    // 8. Calculer les KPIs pour la période

    // --- Projects ---
    let projectsTotal = 0;
    let projectsOpen = 0;
    let projectsClosed = 0;

    for (const p of projects) {
      const projectDate = parseDate(p.dateReelle || p.date);
      if (!projectDate || projectDate < dateRange.start || projectDate > dateRange.end) continue;
      
      projectsTotal++;
      const state = String(p.state || '').toLowerCase();
      if (['clos', 'closed', 'terminé', 'termine', 'done'].includes(state)) {
        projectsClosed++;
      } else {
        projectsOpen++;
      }
    }

    // --- Factures ---
    let facturesTotal = 0;
    let facturesAmountHT = 0;
    let facturesPaidHT = 0;
    let facturesDueHT = 0;

    for (const f of allFactures || []) {
      // Vérifier que la facture appartient à un projet du commanditaire
      if (!projectIds.has(f.projectId)) continue;
      
      const factureDate = parseDate(f.dateReelle || f.date);
      if (!factureDate || factureDate < dateRange.start || factureDate > dateRange.end) continue;
      
      // Exclure les avoirs pour le comptage (mais les inclure comme négatif pour le montant)
      const invoiceType = String(f.invoiceType || '').toLowerCase();
      const isAvoir = invoiceType.includes('avoir') || invoiceType === 'credit_note';
      
      const totalHT = Number(f.data?.totalHT || f.totalHT || 0);
      const resteDu = Number(f.data?.calcReglementsReste || f.calcReglementsReste || f.restePaidTTC || 0);
      
      if (!isAvoir) {
        facturesTotal++;
        facturesAmountHT += totalHT;
        facturesDueHT += resteDu;
        facturesPaidHT += totalHT - resteDu;
      } else {
        // Avoir = montant négatif
        facturesAmountHT -= Math.abs(totalHT);
      }
    }

    // --- Devis ---
    let devisTotal = 0;
    let devisAccepted = 0;
    let devisAmountHT = 0;

    const acceptedStates = ['validated', 'signed', 'order', 'accepted', 'validé', 'signé', 'commande'];

    for (const d of allDevis || []) {
      // Vérifier que le devis appartient à un projet du commanditaire
      if (!projectIds.has(d.projectId)) continue;
      
      const devisDate = parseDate(d.dateReelle || d.date);
      if (!devisDate || devisDate < dateRange.start || devisDate > dateRange.end) continue;
      
      devisTotal++;
      devisAmountHT += Number(d.totalHT || d.data?.totalHT || 0);
      
      const state = String(d.state || '').toLowerCase();
      if (acceptedStates.some(s => state.includes(s))) {
        devisAccepted++;
      }
    }

    // 9. Récupérer les demandes d'intervention de l'apporteur
    const { data: demands, error: demandsError } = await supabase
      .from('apporteur_intervention_requests')
      .select('id, status, created_at')
      .eq('apporteur_id', apporteur.id)
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString());

    let demandsTotal = 0;
    let demandsPending = 0;
    let demandsCompleted = 0;

    if (!demandsError && demands) {
      demandsTotal = demands.length;
      for (const d of demands) {
        if (d.status === 'SUBMITTED' || d.status === 'pending') {
          demandsPending++;
        } else if (d.status === 'COMPLETED' || d.status === 'completed') {
          demandsCompleted++;
        }
      }
    }

    // 10. Construire la réponse
    const stats: ApporteurStats = {
      period: {
        from: dateRange.start.toISOString().split('T')[0],
        to: dateRange.end.toISOString().split('T')[0],
      },
      projects: {
        total: projectsTotal,
        open: projectsOpen,
        closed: projectsClosed,
      },
      devis: {
        total: devisTotal,
        accepted: devisAccepted,
        amount_ht: Math.round(devisAmountHT * 100) / 100,
        conversion_rate: devisTotal > 0 ? Math.round((devisAccepted / devisTotal) * 100) / 100 : 0,
      },
      factures: {
        total: facturesTotal,
        amount_ht: Math.round(facturesAmountHT * 100) / 100,
        paid_ht: Math.round(facturesPaidHT * 100) / 100,
        due_ht: Math.round(facturesDueHT * 100) / 100,
      },
      demands: {
        total: demandsTotal,
        pending: demandsPending,
        completed: demandsCompleted,
      },
    };

    console.log(`[GET-APPORTEUR-STATS] Stats for apporteur ${apporteur.name} (commanditaireId: ${commanditaireId})`);

    return withCors(req, new Response(
      JSON.stringify({ success: true, data: stats }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));

  } catch (error) {
    console.error('[GET-APPORTEUR-STATS] Exception:', error instanceof Error ? error.message : error);
    
    return withCors(req, new Response(
      JSON.stringify({ success: false, error: 'Erreur interne' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
});
