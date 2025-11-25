import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface KpiRequest {
  period?: 'day' | 'yesterday' | 'week' | 'month' | 'year' | 'rolling12';
}

interface KpiResponse {
  agency: {
    slug: string;
    label: string;
  };
  period: {
    type: string;
    start: string;
    end: string;
  };
  kpis: {
    // T1 - CA HT période (sélecteur)
    ca_period: number;
    // T2 - CA HT J-1
    ca_yesterday: number;
    // T3 - CA HT semaine en cours
    ca_week: number;
    // T4 - CA HT mois en cours
    ca_month: number;
    // T5 - CA HT année en cours
    ca_year: number;
    // T6 - CA HT 12 mois glissants
    ca_rolling12: number;
    // T7 - Nombre de factures (période active)
    invoices_count: number;
    // T8 - Panier moyen facture (période active)
    avg_invoice: number;
    // T9 - Taux de CA apporteurs (%)
    apporteurs_rate: number;
    // T10 - Nombre de projets en cours
    projects_in_progress: number;
    // T11 - Interventions planifiées aujourd'hui
    interventions_today: number;
    // T12 - Taux de SAV (en CA) sur la période active
    sav_rate: number;
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
    case 'day':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'yesterday':
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case 'week':
      const dayOfWeek = now.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      start.setDate(now.getDate() + diffToMonday);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'year':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'rolling12':
      start.setDate(now.getDate() - 365);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    default:
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
  }

  return { start, end };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('agence')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.agence) {
      return new Response(
        JSON.stringify({ error: 'User agency not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const agencySlug = profile.agence;
    const { data: agency } = await supabase
      .from('apogee_agencies')
      .select('label')
      .eq('slug', agencySlug)
      .eq('is_active', true)
      .maybeSingle();

    const agencyLabel = agency?.label || agencySlug.toUpperCase();
    const apiKey = Deno.env.get('APOGEE_API_KEY');
    const apiBaseUrl = `https://${agencySlug}.hc-apogee.fr/api/`;

    const body: KpiRequest = req.method === 'POST' ? await req.json() : {};
    const period = body.period || 'month';
    const dates = getPeriodDates(period);
    const now = new Date();

    console.log(`[get-kpis] Fetching data for ${agencySlug} - Period: ${period}`);

    console.log(`[get-kpis] Calling Apogée API: ${apiBaseUrl}apiGetFactures`);
    console.log(`[get-kpis] Calling Apogée API: ${apiBaseUrl}apiGetInterventions`);
    console.log(`[get-kpis] Calling Apogée API: ${apiBaseUrl}apiGetProjects`);
    console.log(`[get-kpis] Calling Apogée API: ${apiBaseUrl}apiGetClients`);
    console.log(`[get-kpis] Calling Apogée API: ${apiBaseUrl}apiGetInterventionsCreneaux`);

    // Fetch all data in parallel
    const [facturesRes, interventionsRes, projectsRes, clientsRes, creneauxRes] = await Promise.all([
      fetch(`${apiBaseUrl}apiGetFactures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ API_KEY: apiKey }),
      }),
      fetch(`${apiBaseUrl}apiGetInterventions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ API_KEY: apiKey }),
      }),
      fetch(`${apiBaseUrl}apiGetProjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ API_KEY: apiKey }),
      }),
      fetch(`${apiBaseUrl}apiGetClients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ API_KEY: apiKey }),
      }),
      fetch(`${apiBaseUrl}apiGetInterventionsCreneaux`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ API_KEY: apiKey }),
      }),
    ]);

    const factures = await facturesRes.json();
    const interventions = await interventionsRes.json();
    const projects = await projectsRes.json();
    const clients = await clientsRes.json();
    const creneaux = await creneauxRes.json();

    console.log(`[get-kpis] Data received - Factures: ${factures?.length || 0}, Interventions: ${interventions?.length || 0}, Projects: ${projects?.length || 0}`);

    // Helper function to filter invoices by date range
    const filterInvoicesByPeriod = (invoices: any[], start: Date, end: Date) => {
      return invoices.filter((f: any) => {
        const invoiceDate = new Date(f.dateReelle || f.date);
        return invoiceDate >= start && invoiceDate <= end;
      });
    };

    // Filter valid invoices (exclude credits/avoirs)
    const validInvoices = (factures || []).filter((f: any) => {
      const isRealInvoice = f.type === 'facture' || f.isCreditNote !== true;
      const isValidStatus = f.status !== 'cancelled' && f.status !== 'draft';
      return isRealInvoice && isValidStatus;
    });

    // T1 - CA HT période (sélecteur)
    const periodInvoices = filterInvoicesByPeriod(validInvoices, dates.start, dates.end);
    const ca_period = periodInvoices.reduce((sum: number, f: any) => sum + (f.totalHT || 0), 0);

    // T2 - CA HT J-1
    const yesterdayDates = getPeriodDates('yesterday');
    const yesterdayInvoices = filterInvoicesByPeriod(validInvoices, yesterdayDates.start, yesterdayDates.end);
    const ca_yesterday = yesterdayInvoices.reduce((sum: number, f: any) => sum + (f.totalHT || 0), 0);

    // T3 - CA HT semaine en cours
    const weekDates = getPeriodDates('week');
    const weekInvoices = filterInvoicesByPeriod(validInvoices, weekDates.start, weekDates.end);
    const ca_week = weekInvoices.reduce((sum: number, f: any) => sum + (f.totalHT || 0), 0);

    // T4 - CA HT mois en cours
    const monthDates = getPeriodDates('month');
    const monthInvoices = filterInvoicesByPeriod(validInvoices, monthDates.start, monthDates.end);
    const ca_month = monthInvoices.reduce((sum: number, f: any) => sum + (f.totalHT || 0), 0);

    // T5 - CA HT année en cours
    const yearDates = getPeriodDates('year');
    const yearInvoices = filterInvoicesByPeriod(validInvoices, yearDates.start, yearDates.end);
    const ca_year = yearInvoices.reduce((sum: number, f: any) => sum + (f.totalHT || 0), 0);

    // T6 - CA HT 12 mois glissants
    const rolling12Dates = getPeriodDates('rolling12');
    const rolling12Invoices = filterInvoicesByPeriod(validInvoices, rolling12Dates.start, rolling12Dates.end);
    const ca_rolling12 = rolling12Invoices.reduce((sum: number, f: any) => sum + (f.totalHT || 0), 0);

    // T7 - Nombre de factures (période active)
    const invoices_count = periodInvoices.length;

    // T8 - Panier moyen facture (période active)
    const avg_invoice = invoices_count > 0 ? ca_period / invoices_count : 0;

    // T9 - Taux de CA apporteurs (%)
    // Build client map
    const clientMap = new Map();
    (clients || []).forEach((c: any) => {
      clientMap.set(c.id, c);
    });

    // Build project map
    const projectMap = new Map();
    (projects || []).forEach((p: any) => {
      projectMap.set(p.id, p);
    });

    let ca_apporteurs = 0;
    periodInvoices.forEach((invoice: any) => {
      const project = projectMap.get(invoice.projectId);
      if (project) {
        const client = clientMap.get(project.clientId);
        if (client?.data?.isCommanditaire === true) {
          ca_apporteurs += invoice.totalHT || 0;
        }
      }
    });

    const apporteurs_rate = ca_period > 0 ? (ca_apporteurs / ca_period) * 100 : 0;

    // T10 - Nombre de projets en cours
    const projects_in_progress = (projects || []).filter((p: any) => {
      const status = (p.status || '').toLowerCase();
      return status === 'en cours' || status === 'ouvert' || status === 'open' || status === 'in_progress';
    }).length;

    // T11 - Interventions planifiées aujourd'hui
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const interventions_today = (creneaux || []).filter((c: any) => {
      const creneauDate = new Date(c.date || c.dateDebut || c.start);
      return creneauDate >= todayStart && creneauDate <= todayEnd;
    }).length;

    // T12 - Taux de SAV (en CA) sur la période active
    // Detect SAV interventions
    const savInterventions = (interventions || []).filter((i: any) => {
      const type = (i.type || '').toLowerCase();
      const labelKind = (i.labelKind || '').toLowerCase();
      return type.includes('sav') || type.includes('dépannage') || labelKind.includes('sav') || labelKind.includes('dépannage');
    });

    // Get project IDs with SAV interventions in period
    const savProjectIds = new Set();
    savInterventions.forEach((i: any) => {
      const intDate = new Date(i.date);
      if (intDate >= dates.start && intDate <= dates.end) {
        savProjectIds.add(i.projectId);
      }
    });

    // Calculate CA SAV
    let ca_sav = 0;
    periodInvoices.forEach((invoice: any) => {
      if (savProjectIds.has(invoice.projectId)) {
        ca_sav += invoice.totalHT || 0;
      }
    });

    const sav_rate = ca_period > 0 ? (ca_sav / ca_period) * 100 : 0;

    // Build details for graphs (reusing existing logic)
    const caByUniverse: Record<string, number> = {};
    const caByApporteurType: Record<string, number> = {};

    console.log(`[get-kpis] Success - CA période: ${ca_period.toFixed(2)}, CA année: ${ca_year.toFixed(2)}`);

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
        ca_yesterday,
        ca_week,
        ca_month,
        ca_year,
        ca_rolling12,
        invoices_count,
        avg_invoice,
        apporteurs_rate,
        projects_in_progress,
        interventions_today,
        sav_rate,
      },
      details: {
        ca_by_universe: [],
        ca_by_apporteur_type: [],
        ca_by_technician: [],
        invoices_history: [],
        apporteurs: [],
        technicians: [],
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[get-kpis] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
