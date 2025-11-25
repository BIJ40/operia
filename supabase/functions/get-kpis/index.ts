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
    console.log(`[get-kpis] Calling Apogée API: ${apiBaseUrl}apiGetDevis`);

    // Fetch all data in parallel
    const [facturesRes, interventionsRes, projectsRes, clientsRes, creneauxRes, devisRes] = await Promise.all([
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
      fetch(`${apiBaseUrl}apiGetDevis`, {
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
    const devis = await devisRes.json();

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
      const isRealInvoice = f.type !== 'avoir' && f.isCreditNote !== true;
      const isValidStatus = !f.status || (f.status !== 'cancelled' && f.status !== 'draft');
      return isRealInvoice && isValidStatus;
    });

    // CA HT période (sélecteur)
    const periodInvoices = filterInvoicesByPeriod(validInvoices, dates.start, dates.end);
    const ca_period = periodInvoices.reduce((sum: number, f: any) => sum + parseFloat(f.totalHT || f.totalTTC || 0), 0);

    // Nombre de factures (période active)
    const invoices_count = periodInvoices.length;

    // Panier moyen facture (période active)
    const avg_invoice = invoices_count > 0 ? ca_period / invoices_count : 0;

    // Taux de CA apporteurs (%)
    const clientMap = new Map();
    (clients || []).forEach((c: any) => {
      clientMap.set(c.id, c);
    });

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
          ca_apporteurs += parseFloat(invoice.totalHT || invoice.totalTTC || 0);
        }
      }
    });

    const apporteurs_rate = ca_period > 0 ? (ca_apporteurs / ca_period) * 100 : 0;

    // Nombre de projets en cours
    const projects_in_progress = (projects || []).filter((p: any) => {
      const status = (p.status || '').toLowerCase();
      return status === 'en cours' || status === 'ouvert' || status === 'open' || status === 'in_progress';
    }).length;

    // Interventions planifiées aujourd'hui
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const interventions_today = (creneaux || []).filter((c: any) => {
      const creneauDate = new Date(c.date || c.dateDebut || c.start);
      return creneauDate >= todayStart && creneauDate <= todayEnd;
    }).length;

    // Taux de SAV (en CA) sur la période active
    const savInterventions = (interventions || []).filter((i: any) => {
      const type = (i.type || '').toLowerCase();
      const labelKind = (i.labelKind || '').toLowerCase();
      return type.includes('sav') || type.includes('dépannage') || labelKind.includes('sav') || labelKind.includes('dépannage');
    });

    const savProjectIds = new Set();
    savInterventions.forEach((i: any) => {
      const intDate = new Date(i.date);
      if (intDate >= dates.start && intDate <= dates.end) {
        savProjectIds.add(i.projectId);
      }
    });

    let ca_sav = 0;
    periodInvoices.forEach((invoice: any) => {
      if (savProjectIds.has(invoice.projectId)) {
        ca_sav += parseFloat(invoice.totalHT || invoice.totalTTC || 0);
      }
    });

    const sav_rate = ca_period > 0 ? (ca_sav / ca_period) * 100 : 0;

    // Autres KPIs pour les tuiles supplémentaires
    const periodInterventions = (interventions || []).filter((i: any) => {
      const intDate = new Date(i.date);
      return intDate >= dates.start && intDate <= dates.end;
    });
    const interventions_count = periodInterventions.length;

    const periodDevis = (devis || []).filter((d: any) => {
      const devisDate = new Date(d.date);
      return devisDate >= dates.start && devisDate <= dates.end;
    });
    const devis_count = periodDevis.length;

    const periodProjects = (projects || []).filter((p: any) => {
      const projectDate = new Date(p.createdAt);
      return projectDate >= dates.start && projectDate <= dates.end;
    });
    const projects_count = periodProjects.length;

    const conversion_rate = devis_count > 0 ? (invoices_count / devis_count) * 100 : 0;

    const activeTechnicians = new Set();
    periodInterventions.forEach((i: any) => {
      if (i.userId) activeTechnicians.add(i.userId);
      if (i.userIds) i.userIds.forEach((uid: string) => activeTechnicians.add(uid));
      if (i.data?.visites?.[0]?.usersIds) {
        i.data.visites[0].usersIds.forEach((uid: string) => activeTechnicians.add(uid));
      }
    });
    const active_technicians = activeTechnicians.size;

    // Build details for graphs (reusing existing logic)
    const caByUniverse: Record<string, number> = {};
    const caByApporteurType: Record<string, number> = {};

    console.log(`[get-kpis] Success - CA période: ${ca_period.toFixed(2)}, Factures: ${invoices_count}`);

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
        ca_period: Math.round(ca_period * 100) / 100,
        invoices_count,
        avg_invoice: Math.round(avg_invoice * 100) / 100,
        apporteurs_rate: Math.round(apporteurs_rate * 10) / 10,
        projects_in_progress,
        interventions_today,
        sav_rate: Math.round(sav_rate * 10) / 10,
        interventions_count,
        devis_count,
        projects_count,
        conversion_rate: Math.round(conversion_rate * 10) / 10,
        active_technicians,
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
