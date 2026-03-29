import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { handleCorsPreflightOrReject, withCors, getCorsHeaders, isOriginAllowed } from '../_shared/cors.ts';
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';
import { captureEdgeException } from '../_shared/sentry.ts';
import { errorResponse, successResponse, authError, validationError } from '../_shared/error.ts';

interface KpiRequest {
  period?: 'day' | '7days' | 'month' | 'year' | 'rolling12';
}

interface KpiResponse {
  agency: { slug: string; label: string };
  period: { type: string; start: string; end: string };
  kpis: {
    ca_period: number;
    invoices_count: number;
    avg_invoice: number;
    apporteurs_rate: number;
    projects_in_progress: number;
    interventions_today: number;
    sav_rate: number;
    interventions_count: number;
    devis_count: number;
    projects_count: number;
    conversion_rate: number;
    active_technicians: number;
  };
  details: {
    ca_by_universe: Array<{ universe: string; amount: number }>;
    ca_by_apporteur_type: Array<{ type: string; amount: number }>;
    ca_by_technician: Array<{ name: string; amount: number; interventions: number }>;
    invoices_history: Array<{ date: string; amount: number }>;
    apporteurs: Array<{ name: string; ca: number; projects: number; type: string }>;
    technicians: Array<{
      name: string;
      ca: number;
      interventions: number;
      sav: number;
      universes: Array<{ universe: string; amount: number }>;
    }>;
  };
}

function getPeriodDates(period: string): { start: Date; end: Date } {
  const now = new Date();
  let start = new Date();
  let end = new Date();

  switch (period) {
    case 'day': // Jour
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case '7days': // 7 derniers jours
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'month': // Mois en cours
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'year': // Année en cours
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'rolling12': // 12 mois glissants
      start.setMonth(now.getMonth() - 12);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    default: // Par défaut : mois en cours
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
  }

  return { start, end };
}

function parseDate(dateStr: any): Date | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

Deno.serve(async (req) => {
  // Handle CORS preflight or reject unauthorized origins
  const corsResult = handleCorsPreflightOrReject(req);
  if (corsResult) return corsResult;

  const origin = req.headers.get('origin') ?? '';
  const corsHeaders = isOriginAllowed(origin) ? getCorsHeaders(origin) : {};

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return withCors(req, authError('En-tête d\'autorisation manquant'));
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return withCors(req, authError('Non autorisé'));
    }

    // Rate limit: 20 req/min per user
    const rateLimitKey = `get-kpis:${user.id}`;
    const rateCheck = await checkRateLimit(rateLimitKey, { limit: 20, windowMs: 60 * 1000 });
    if (!rateCheck.allowed) {
      console.log(`[GET-KPIS] Rate limit exceeded for ${rateLimitKey}`);
      return rateLimitResponse(rateCheck.retryAfter!, corsHeaders);
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('agency_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.agency_id) {
      return withCors(req, validationError('Agence utilisateur non configurée'));
    }

    // Resolve slug from agency_id
    const { data: agencyData } = await supabase
      .from('apogee_agencies')
      .select('slug, label')
      .eq('id', profile.agency_id)
      .eq('is_active', true)
      .maybeSingle();

    if (!agencyData?.slug) {
      return withCors(req, validationError('Agence utilisateur non configurée'));
    }

    const agencySlug = agencyData.slug;
    const agencyLabel = agencyData.label || agencySlug.toUpperCase();
    const apiKey = Deno.env.get('APOGEE_API_KEY');
    const apiBaseUrl = `https://${agencySlug}.hc-apogee.fr/api/`;

    const body: KpiRequest & { forceError?: boolean } = req.method === 'POST' ? await req.json() : {};
    
    // Test mode: force error for Sentry testing
    if (body.forceError === true) {
      throw new Error('test-sentry-edge-get-kpis');
    }
    
    const period = body.period || 'month';
    const dates = getPeriodDates(period);
    const now = new Date();

    console.log(`[get-kpis] Agency: ${agencySlug}, Period: ${period}, Dates: ${dates.start.toISOString()} to ${dates.end.toISOString()}`);

    // Fetch all data in parallel
    const fetchJson = async (url: string, label: string) => {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ API_KEY: apiKey }),
        });

        if (!res.ok) {
          console.error(`[get-kpis] ${label} error:`, res.status);
          return [];
        }

        const json = await res.json();
        console.log(`[get-kpis] ${label}: ${Array.isArray(json) ? json.length : 0} items`);
        return Array.isArray(json) ? json : [];
      } catch (e) {
        console.error(`[get-kpis] ${label} exception:`, e);
        return [];
      }
    };

    const [factures, interventions, projects, clients, devis, users] = await Promise.all([
      fetchJson(`${apiBaseUrl}apiGetFactures`, 'Factures'),
      fetchJson(`${apiBaseUrl}apiGetInterventions`, 'Interventions'),
      fetchJson(`${apiBaseUrl}apiGetProjects`, 'Projects'),
      fetchJson(`${apiBaseUrl}apiGetClients`, 'Clients'),
      fetchJson(`${apiBaseUrl}apiGetDevis`, 'Devis'),
      fetchJson(`${apiBaseUrl}apiGetUsers`, 'Users'),
    ]);

    // ===== Helper: Calculate invoice total from items =====
    const calculateInvoiceTotal = (invoice: any): number => {
      if (!invoice.items || !Array.isArray(invoice.items)) return 0;
      return invoice.items.reduce((sum: number, item: any) => {
        const itemTotal = parseFloat(item.totalHt || item.totalHT || 0);
        return sum + itemTotal;
      }, 0);
    };

    // ===== Tuile 1, 2, 3: CA HT, Factures, Panier Moyen =====
    const facturesValides = (factures || []).filter((f: any) => {
      if (f.data?.isInit === true) return false;
      if (f.type === 'Avoir' || f.type === 'avoir' || f.isCreditNote === true) return false;
      if (f.statut === 'cancelled' || f.statut === 'draft') return false;
      
      const factureDate = parseDate(f.dateEmission || f.date || f.dateReelle);
      if (!factureDate) return false;
      
      return factureDate >= dates.start && factureDate <= dates.end;
    });

    const ca_period = facturesValides.reduce((sum: number, f: any) => sum + calculateInvoiceTotal(f), 0);
    const invoices_count = facturesValides.length;
    const avg_invoice = invoices_count > 0 ? ca_period / invoices_count : 0;

    console.log(`[get-kpis] CA period: ${ca_period}, Factures: ${invoices_count}, Panier moyen: ${avg_invoice}`);

    // ===== Maps for lookups =====
    const clientMap = new Map((clients || []).map((c: any) => [c.id, c]));
    const projectMap = new Map((projects || []).map((p: any) => [p.id, p]));
    const userMap = new Map((users || []).map((u: any) => [u.id, u]));

    // ===== Tuile 4: Taux Apporteurs =====
    const projectsSample = (projects || []).slice(0, 3);
    console.log('[get-kpis] Sample projects:', JSON.stringify(projectsSample.map((p: any) => ({
      id: p.id,
      'data.commanditaireId': p.data?.commanditaireId,
      clientId: p.clientId,
      keys: Object.keys(p)
    })), null, 2));
    
    const projectsWithCommanditaire = (projects || []).filter((p: any) => p.data?.commanditaireId);
    console.log(`[get-kpis] Dossiers with commanditaire: ${projectsWithCommanditaire.length} / ${projects.length}`);
    
    let ca_apporteurs = 0;
    const apporteursCA: Record<string, { ca: number; projects: Set<string>; type: string; name: string }> = {};

    facturesValides.forEach((invoice: any) => {
      const project = projectMap.get(invoice.projectId);
      if (project?.data?.commanditaireId) {
        const commanditaireId = project.data.commanditaireId;
        const client = clientMap.get(commanditaireId);
        if (client) {
          const invoiceCA = calculateInvoiceTotal(invoice);
          ca_apporteurs += invoiceCA;

          if (!apporteursCA[commanditaireId]) {
            apporteursCA[commanditaireId] = {
              ca: 0,
              projects: new Set(),
              type: client.typeClient || client.type || 'Autre',
              name: client.label || client.name || `Client ${commanditaireId}`,
            };
          }
          apporteursCA[commanditaireId].ca += invoiceCA;
          apporteursCA[commanditaireId].projects.add(invoice.projectId);
        }
      }
    });

    const apporteurs_rate = ca_period > 0 ? (ca_apporteurs / ca_period) * 100 : 0;
    console.log(`[get-kpis] CA apporteurs: ${ca_apporteurs}, CA total: ${ca_period}, Taux: ${apporteurs_rate.toFixed(2)}%`);

    // ===== Tuile 5: Dossiers en Cours (hors sélecteur) =====
    const closedStatuses = ['terminé', 'facturé', 'archivé', 'annulé', 'closed', 'archived', 'cancelled'];
    const projects_in_progress = (projects || []).filter((p: any) => {
      const status = (p.statut || p.status || '').toLowerCase();
      return !closedStatuses.includes(status);
    }).length;

    // ===== Tuile 6: Rendez-Vous J (hors sélecteur, toujours aujourd'hui) =====
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const interventions_today = (interventions || []).filter((i: any) => {
      const intDate = parseDate(i.date || i.dateDebut);
      return intDate && isSameDay(intDate, today);
    }).length;

    // ===== Tuile 7: Rendez-Vous (période sélectionnée) =====
    const interventionsPeriode = (interventions || []).filter((i: any) => {
      const intDate = parseDate(i.date || i.dateDebut);
      if (!intDate || intDate < dates.start || intDate > dates.end) return false;
      const status = (i.status || '').toLowerCase();
      return status === 'terminée' || status === 'completed' || status === 'done';
    });
    const interventions_count = interventionsPeriode.length;

    // ===== Tuile 8: Devis (période sélectionnée) =====
    const devisPeriode = (devis || []).filter((d: any) => {
      const rawDate = d.dateReelle || d.date || d.created_at;
      const devisDate = parseDate(rawDate);
      return devisDate && devisDate >= dates.start && devisDate <= dates.end;
    });
    const devis_count = devisPeriode.length;

    // ===== Tuile 9: Dossiers (nouveaux sur la période) =====
    const projetsPeriode = (projects || []).filter((p: any) => {
      const rawDate = p.date || p.created_at;
      const projectDate = parseDate(rawDate);
      return projectDate && projectDate >= dates.start && projectDate <= dates.end;
    });
    const projects_count = projetsPeriode.length;

    // ===== Tuile 10: Taux Conversion (Devis → Accepté/Commandé) =====
    const getState = (d: any) => (d.state || '').toLowerCase();
    
    const devisEnvoyes = devisPeriode.filter((d: any) => {
      const s = getState(d);
      return s !== 'draft';
    });
    
    const devisAcceptes = devisEnvoyes.filter((d: any) => {
      const s = getState(d);
      return s === 'invoice';
    });
    
    const conversion_rate = devisEnvoyes.length > 0 
      ? (devisAcceptes.length / devisEnvoyes.length) * 100 
      : 0;
    
    console.log(`[get-kpis] Devis: ${(devis || []).length} total, ${devisPeriode.length} dans période (dateReelle), ${devisEnvoyes.length} envoyés (hors draft), ${devisAcceptes.length} acceptés (state=invoice), Taux: ${conversion_rate.toFixed(1)}%`);

    // ===== Tuile 11: Techniciens (hors sélecteur) =====
    const technicianRoles = ['technicien', 'tech', 'intervenant'];
    const active_technicians = (users || []).filter((u: any) => {
      const isActive = u.active === true || u.isActive === true;
      const role = (u.role || u.data?.role || '').toLowerCase();
      return isActive && technicianRoles.some(r => role.includes(r));
    }).length;

    // ===== Tuile 12: Taux SAV =====
    const projectsFactures = new Set(facturesValides.map((f: any) => f.projectId));
    
    const projectsAvecSAV = new Set();
    (interventions || []).forEach((interv: any) => {
      if (!projectsFactures.has(interv.projectId)) return;
      
      const isSAV = interv.isSAV === true ||
                    (interv.data?.type || '').toLowerCase().includes('sav') ||
                    (interv.type || '').toLowerCase().includes('sav') ||
                    (interv.labelKind || '').toLowerCase().includes('dépannage');
      
      if (isSAV) {
        projectsAvecSAV.add(interv.projectId);
      }
    });

    const sav_rate = projectsFactures.size > 0 ? (projectsAvecSAV.size / projectsFactures.size) * 100 : 0;
    
    console.log(`[get-kpis] Dossiers facturés: ${projectsFactures.size}, Dossiers SAV: ${projectsAvecSAV.size}, Taux SAV: ${sav_rate.toFixed(1)}%`);

    // ===== DÉTAILS: CA par univers =====
    const caByUniverse: Record<string, number> = {};
    facturesValides.forEach((f: any) => {
      const project = projectMap.get(f.projectId);
      if (project) {
        const universe = project.universe || project.univers || 'Non défini';
        if (!caByUniverse[universe]) caByUniverse[universe] = 0;
        caByUniverse[universe] += calculateInvoiceTotal(f);
      }
    });

    // ===== DÉTAILS: CA par type d'apporteur =====
    const caByApporteurType: Record<string, number> = {};
    Object.values(apporteursCA).forEach(({ ca, type }) => {
      if (!caByApporteurType[type]) caByApporteurType[type] = 0;
      caByApporteurType[type] += ca;
    });

    // ===== DÉTAILS: CA par technicien =====
    const caByTechnician: Record<string, { ca: number; interventions: number; sav: number; universes: Record<string, number> }> = {};
    
    interventionsPeriode.forEach((interv: any) => {
      const projectId = interv.projectId;
      const project = projectMap.get(projectId);
      if (!project) return;

      const projectInvoices = facturesValides.filter((f: any) => f.projectId === projectId);
      const projectCA = projectInvoices.reduce((sum: number, f: any) => sum + calculateInvoiceTotal(f), 0);

      const techIds: string[] = [];
      if (interv.userId) techIds.push(interv.userId);
      if (interv.userIds && Array.isArray(interv.userIds)) techIds.push(...interv.userIds);
      if (interv.data?.visites?.[0]?.usersIds) techIds.push(...interv.data.visites[0].usersIds);

      const uniqueTechIds = [...new Set(techIds)];
      const caPerTech = uniqueTechIds.length > 0 ? projectCA / uniqueTechIds.length : 0;

      const universe = project.universe || project.univers || 'Non défini';
      const isSAV = interv.isSAV === true ||
                    (interv.data?.type || '').toLowerCase().includes('sav') ||
                    (interv.type || '').toLowerCase().includes('sav');

      uniqueTechIds.forEach(techId => {
        if (!caByTechnician[techId]) {
          caByTechnician[techId] = { ca: 0, interventions: 0, sav: 0, universes: {} };
        }
        caByTechnician[techId].ca += caPerTech;
        caByTechnician[techId].interventions += 1;
        if (isSAV) caByTechnician[techId].sav += 1;
        if (!caByTechnician[techId].universes[universe]) {
          caByTechnician[techId].universes[universe] = 0;
        }
        caByTechnician[techId].universes[universe] += caPerTech;
      });
    });

    // ===== Construire la réponse finale =====
    const response: KpiResponse = {
      agency: {
        slug: agencySlug,
        label: agencyLabel,
      },
      period: {
        type: period,
        start: dates.start.toISOString(),
        end: dates.end.toISOString(),
      },
      kpis: {
        ca_period,
        invoices_count,
        avg_invoice,
        apporteurs_rate,
        projects_in_progress,
        interventions_today,
        sav_rate,
        interventions_count,
        devis_count,
        projects_count,
        conversion_rate,
        active_technicians,
      },
      details: {
        ca_by_universe: Object.entries(caByUniverse)
          .map(([universe, amount]) => ({ universe, amount }))
          .sort((a, b) => b.amount - a.amount),
        ca_by_apporteur_type: Object.entries(caByApporteurType)
          .map(([type, amount]) => ({ type, amount }))
          .sort((a, b) => b.amount - a.amount),
        ca_by_technician: Object.entries(caByTechnician)
          .map(([techId, data]) => {
            const techUser = userMap.get(techId);
            return {
              name: techUser?.label || techUser?.name || `Tech ${techId}`,
              amount: data.ca,
              interventions: data.interventions,
            };
          })
          .sort((a, b) => b.amount - a.amount),
        invoices_history: [],
        apporteurs: Object.entries(apporteursCA)
          .map(([id, data]) => ({
            name: data.name,
            ca: data.ca,
            projects: data.projects.size,
            type: data.type,
          }))
          .sort((a, b) => b.ca - a.ca)
          .slice(0, 20),
        technicians: Object.entries(caByTechnician)
          .map(([techId, data]) => {
            const techUser = userMap.get(techId);
            return {
              name: techUser?.label || techUser?.name || `Tech ${techId}`,
              ca: data.ca,
              interventions: data.interventions,
              sav: data.sav,
              universes: Object.entries(data.universes)
                .map(([universe, amount]) => ({ universe, amount }))
                .sort((a, b) => b.amount - a.amount),
            };
          })
          .sort((a, b) => b.ca - a.ca),
      },
    };

    console.log('[get-kpis] Response generated successfully');

    return withCors(req, successResponse(response));

  } catch (error) {
    console.error('[get-kpis] Error:', error);
    
    // Try to extract user context for better Sentry reporting
    let userId: string | undefined;
    let globalRole: string | undefined;
    let agencySlug: string | undefined;
    try {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) {
          userId = user.id;
          const { data: profile } = await supabaseClient
            .from('profiles')
            .select('global_role, agency_id')
            .eq('id', user.id)
            .maybeSingle();
          globalRole = profile?.global_role ?? undefined;
          if (profile?.agency_id) {
            const { data: agRow } = await supabaseClient.from('apogee_agencies').select('slug').eq('id', profile.agency_id).maybeSingle();
            agencySlug = agRow?.slug ?? undefined;
          }
        }
      }
    } catch (_) {
      // Best effort only
    }

    // Report to Sentry with full context
    await captureEdgeException(error, {
      function: 'get-kpis',
      userId,
      globalRole,
      agencySlug,
    });
    
    return withCors(req, errorResponse(
      'GET_KPIS_FAILED',
      'Erreur interne lors de la récupération des KPIs',
      { error: error instanceof Error ? error.message : String(error) }
    ));
  }
});
