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
    // Tuiles principales
    ca_period: number;
    ca_year: number;
    invoices_count: number;
    interventions_count: number;
    devis_count: number;
    projects_count: number;
    avg_invoice: number;
    avg_project: number;
    conversion_rate: number;
    sav_count: number;
    sav_percentage: number;
    active_technicians: number;
  };
  details: {
    // Pour graphiques et sections
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

async function callApogeeApi(
  agenceSlug: string, 
  apiKey: string, 
  endpoint: string, 
  additionalData: Record<string, any> = {}
): Promise<any> {
  const baseUrl = `https://${agenceSlug}.hc-apogee.fr/api`;
  const fullUrl = `${baseUrl}/${endpoint}`;
  
  console.log(`[get-kpis] Calling Apogée API: ${fullUrl}`);
  
  try {
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        API_KEY: apiKey,
        ...additionalData,
      }),
    });

    if (!response.ok) {
      throw new Error(`Apogée API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`[get-kpis] Error calling Apogée API:`, error);
    throw error;
  }
}

function getPeriodDates(period: string): { start: string; end: string } {
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

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
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

    const { data: agency } = await supabase
      .from('apogee_agencies')
      .select('slug, label, is_active')
      .eq('slug', profile.agence)
      .eq('is_active', true)
      .maybeSingle();

    const agenceSlug = profile.agence;
    const agenceLabel = agency?.label || profile.agence.toUpperCase();

    const apiKey = Deno.env.get('APOGEE_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: KpiRequest = req.method === 'POST' ? await req.json() : {};
    const periodType = body.period || 'month';
    const periodDates = getPeriodDates(periodType);

    console.log(`[get-kpis] Fetching data for ${agenceSlug} - Period: ${periodType}`);

    // Fetch all data in parallel
    const [facturesResponse, interventionsResponse, projectsResponse, devisResponse, usersResponse, clientsResponse] = await Promise.all([
      callApogeeApi(agenceSlug, apiKey, 'apiGetFactures', {}),
      callApogeeApi(agenceSlug, apiKey, 'apiGetInterventions', {}),
      callApogeeApi(agenceSlug, apiKey, 'apiGetProjects', {}),
      callApogeeApi(agenceSlug, apiKey, 'apiGetDevis', {}),
      callApogeeApi(agenceSlug, apiKey, 'apiGetUsers', {}),
      callApogeeApi(agenceSlug, apiKey, 'apiGetClients', {})
    ]);

    const factures = Array.isArray(facturesResponse) ? facturesResponse : facturesResponse?.data || [];
    const interventions = Array.isArray(interventionsResponse) ? interventionsResponse : interventionsResponse?.data || [];
    const projects = Array.isArray(projectsResponse) ? projectsResponse : projectsResponse?.data || [];
    const devis = Array.isArray(devisResponse) ? devisResponse : devisResponse?.data || [];
    const users = Array.isArray(usersResponse) ? usersResponse : usersResponse?.data || [];
    const clients = Array.isArray(clientsResponse) ? clientsResponse : clientsResponse?.data || [];

    console.log(`[get-kpis] Data received - Factures: ${factures.length}, Interventions: ${interventions.length}, Projects: ${projects.length}`);

    const periodStart = new Date(periodDates.start);
    const periodEnd = new Date(periodDates.end);
    const yearStart = new Date(periodEnd.getFullYear(), 0, 1);

    // Filter factures (exclude avoirs)
    const filteredFactures = factures.filter((f: any) => {
      if (!f.date && !f.dateReelle) return false;
      const factureDate = new Date(f.dateReelle || f.date);
      return f.type !== 'avoir' && factureDate >= periodStart && factureDate <= periodEnd;
    });

    const yearFactures = factures.filter((f: any) => {
      if (!f.date && !f.dateReelle) return false;
      const factureDate = new Date(f.dateReelle || f.date);
      return f.type !== 'avoir' && factureDate.getFullYear() === periodEnd.getFullYear();
    });

    // Filter other data by period
    const filteredInterventions = interventions.filter((i: any) => {
      if (!i.date) return false;
      const intDate = new Date(i.date);
      return intDate >= periodStart && intDate <= periodEnd;
    });

    const filteredDevis = devis.filter((d: any) => {
      if (!d.date) return false;
      const devisDate = new Date(d.date);
      return devisDate >= periodStart && devisDate <= periodEnd;
    });

    const filteredProjects = projects.filter((p: any) => {
      if (!p.createdAt) return false;
      const projectDate = new Date(p.createdAt);
      return projectDate >= periodStart && projectDate <= periodEnd;
    });

    // Get technicians
    const technicians = users.filter((u: any) => u.type === 'technicien');
    const activeTechnicians = new Set();

    // Detect SAV interventions
    const savInterventions = filteredInterventions.filter((i: any) => 
      i.type?.toLowerCase().includes('sav') || 
      i.type?.toLowerCase().includes('depannage') ||
      i.data?.type2?.toLowerCase().includes('sav') ||
      i.data?.type2?.toLowerCase().includes('dépannage')
    );

    // Calculate base KPIs
    const caPeriod = filteredFactures.reduce((sum: number, f: any) => 
      sum + parseFloat(f.totalHT || f.totalTTC || 0), 0
    );

    const caYear = yearFactures.reduce((sum: number, f: any) => 
      sum + parseFloat(f.totalHT || f.totalTTC || 0), 0
    );

    const avgInvoice = filteredFactures.length > 0 ? caPeriod / filteredFactures.length : 0;
    const avgProject = filteredProjects.length > 0 ? caPeriod / filteredProjects.length : 0;
    const conversionRate = filteredDevis.length > 0 ? (filteredFactures.length / filteredDevis.length) * 100 : 0;
    const savPercentage = filteredInterventions.length > 0 ? (savInterventions.length / filteredInterventions.length) * 100 : 0;

    // CA by universe (from projects data)
    const caByUniverse: Record<string, number> = {};
    filteredProjects.forEach((p: any) => {
      const universes = p.universes || p.data?.universes || [];
      const projectFactures = filteredFactures.filter((f: any) => f.projectId === p.id);
      const projectCA = projectFactures.reduce((sum: number, f: any) => 
        sum + parseFloat(f.totalHT || f.totalTTC || 0), 0
      );
      
      if (universes.length > 0) {
        const perUniverse = projectCA / universes.length;
        universes.forEach((u: string) => {
          caByUniverse[u] = (caByUniverse[u] || 0) + perUniverse;
        });
      }
    });

    // CA by apporteur type
    const caByApporteurType: Record<string, number> = {};
    filteredProjects.forEach((p: any) => {
      const client = clients.find((c: any) => c.id === p.clientId);
      if (client?.data?.isCommanditaire) {
        const type = client.data?.type || 'Autre';
        const projectFactures = filteredFactures.filter((f: any) => f.projectId === p.id);
        const projectCA = projectFactures.reduce((sum: number, f: any) => 
          sum + parseFloat(f.totalHT || f.totalTTC || 0), 0
        );
        caByApporteurType[type] = (caByApporteurType[type] || 0) + projectCA;
      }
    });

    // CA by technician (distribute equally among technicians on same project)
    const technicianStats: Record<string, { ca: number; interventions: number; sav: number; universes: Record<string, number> }> = {};
    
    filteredInterventions.forEach((i: any) => {
      const techIds = i.data?.visites?.[0]?.usersIds || [i.userId].filter(Boolean);
      techIds.forEach((techId: string) => {
        if (!technicianStats[techId]) {
          technicianStats[techId] = { ca: 0, interventions: 0, sav: 0, universes: {} };
        }
        technicianStats[techId].interventions++;
        activeTechnicians.add(techId);
        
        if (savInterventions.find((s: any) => s.id === i.id)) {
          technicianStats[techId].sav++;
        }
        
        // Add CA from project
        const projectFactures = filteredFactures.filter((f: any) => f.projectId === i.projectId);
        const projectCA = projectFactures.reduce((sum: number, f: any) => 
          sum + parseFloat(f.totalHT || f.totalTTC || 0), 0
        );
        
        if (techIds.length > 0) {
          technicianStats[techId].ca += projectCA / techIds.length;
        }
        
        // Add universes
        const project = projects.find((p: any) => p.id === i.projectId);
        const universes = project?.universes || project?.data?.universes || [];
        universes.forEach((u: string) => {
          technicianStats[techId].universes[u] = (technicianStats[techId].universes[u] || 0) + (projectCA / techIds.length / universes.length);
        });
      });
    });

    // Build response
    const response: KpiResponse = {
      agency: {
        slug: agenceSlug,
        label: agenceLabel,
      },
      period: {
        type: periodType,
        start: periodDates.start,
        end: periodDates.end,
      },
      kpis: {
        ca_period: Math.round(caPeriod * 100) / 100,
        ca_year: Math.round(caYear * 100) / 100,
        invoices_count: filteredFactures.length,
        interventions_count: filteredInterventions.length,
        devis_count: filteredDevis.length,
        projects_count: filteredProjects.length,
        avg_invoice: Math.round(avgInvoice * 100) / 100,
        avg_project: Math.round(avgProject * 100) / 100,
        conversion_rate: Math.round(conversionRate * 10) / 10,
        sav_count: savInterventions.length,
        sav_percentage: Math.round(savPercentage * 10) / 10,
        active_technicians: activeTechnicians.size,
      },
      details: {
        ca_by_universe: Object.entries(caByUniverse).map(([universe, amount]) => ({
          universe,
          amount: Math.round(amount * 100) / 100,
        })),
        ca_by_apporteur_type: Object.entries(caByApporteurType).map(([type, amount]) => ({
          type,
          amount: Math.round(amount * 100) / 100,
        })),
        ca_by_technician: Object.entries(technicianStats)
          .map(([techId, stats]) => {
            const tech = users.find((u: any) => u.id === techId);
            return {
              name: tech ? `${tech.firstname || ''} ${tech.lastname || ''}`.trim() : techId,
              amount: Math.round(stats.ca * 100) / 100,
              interventions: stats.interventions,
            };
          })
          .sort((a, b) => b.amount - a.amount),
        invoices_history: filteredFactures.map((f: any) => ({
          date: f.dateReelle || f.date,
          amount: parseFloat(f.totalHT || f.totalTTC || 0),
        })),
        apporteurs: Object.entries(caByApporteurType).map(([type, ca]) => {
          const apporteurClients = clients.filter((c: any) => 
            c.data?.isCommanditaire && c.data?.type === type
          );
          const apporteurProjects = filteredProjects.filter((p: any) =>
            apporteurClients.some((c: any) => c.id === p.clientId)
          );
          return {
            name: type,
            ca: Math.round(ca * 100) / 100,
            projects: apporteurProjects.length,
            type,
          };
        }),
        technicians: Object.entries(technicianStats).map(([techId, stats]) => {
          const tech = users.find((u: any) => u.id === techId);
          return {
            name: tech ? `${tech.firstname || ''} ${tech.lastname || ''}`.trim() : techId,
            ca: Math.round(stats.ca * 100) / 100,
            interventions: stats.interventions,
            sav: stats.sav,
            universes: Object.entries(stats.universes).map(([universe, amount]) => ({
              universe,
              amount: Math.round(amount * 100) / 100,
            })),
          };
        }).sort((a, b) => b.ca - a.ca),
      },
    };

    console.log(`[get-kpis] Success - CA période: ${caPeriod.toFixed(2)}, CA année: ${caYear.toFixed(2)}`);

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
