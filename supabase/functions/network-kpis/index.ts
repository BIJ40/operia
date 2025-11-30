import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { handleCorsPreflightOrReject, withCors, getCorsHeaders, isOriginAllowed } from '../_shared/cors.ts';
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';

// Cache management
interface CacheEntry {
  data: any;
  timestamp: number;
}

let cache: CacheEntry | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Helper function to parse dates
function parseDate(dateString: string): Date | null {
  if (!dateString) return null;
  
  try {
    const isoDate = new Date(dateString);
    if (!isNaN(isoDate.getTime())) return isoDate;
  } catch {}
  
  try {
    const parts = dateString.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) return date;
    }
  } catch {}
  
  return null;
}

// Load data for a single agency
async function loadAgencyData(agencySlug: string) {
  const apiUrl = `https://${agencySlug}.hc-apogee.fr/api/`;
  const apiKey = Deno.env.get('APOGEE_API_KEY');

  try {
    const endpoints = ['users', 'clients', 'projects', 'interventions', 'invoices', 'quotes'];
    const promises = endpoints.map(async endpoint => {
      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ API_KEY: apiKey }),
      });

      try {
        const text = await response.text();
        try {
          return JSON.parse(text);
        } catch (e) {
          console.error(`❌ ${agencySlug}/${endpoint}: JSON parse error`);
          console.error(`Response preview: ${text.substring(0, 200)}`);
          return [];
        }
      } catch (e) {
        console.error(`❌ ${agencySlug}/${endpoint}: network error`, e);
        return [];
      }
    });

    const [users, clients, projects, interventions, invoices, quotes] = await Promise.all(promises);

    return {
      users: Array.isArray(users) ? users : [],
      clients: Array.isArray(clients) ? clients : [],
      projects: Array.isArray(projects) ? projects : [],
      interventions: Array.isArray(interventions) ? interventions : [],
      factures: Array.isArray(invoices) ? invoices : [],
      devis: Array.isArray(quotes) ? quotes : [],
    };
  } catch (error) {
    console.error(`❌ ${agencySlug}: load error`, error);
    return null;
  }
}

// Calculate all network KPIs
function calculateNetworkKPIs(agencyData: any[], dateRange?: { from: Date; to: Date }) {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

  // Calculate total CA for year and period
  const calculateCA = (range: { start: Date; end: Date }) => {
    return agencyData.reduce((sum, agency) => {
      if (!agency.data?.factures) return sum;
      const agencyCA = agency.data.factures
        .filter((f: any) => f.type !== 'avoir')
        .reduce((total: number, f: any) => {
          const dateStr = f.dateReelle || f.dateEmission || f.created_at;
          const d = dateStr ? parseDate(dateStr) : null;
          if (!d || d < range.start || d > range.end) return total;

          const montantRaw = f.data?.totalHT || f.totalHT || f.montantHT || 0;
          const montant = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, '')) || 0;
          return total + montant;
        }, 0);
      return sum + agencyCA;
    }, 0);
  };

  const totalCAYear = calculateCA({ start: yearStart, end: yearEnd });
  const totalCAPeriod = dateRange 
    ? calculateCA({ start: dateRange.from, end: dateRange.to })
    : totalCAYear;

  // Calculate total projects
  const totalProjects = agencyData.reduce((sum, agency) => {
    return sum + (agency.data?.projects?.length || 0);
  }, 0);

  // Calculate total interventions
  const calcRange = dateRange ? { start: dateRange.from, end: dateRange.to } : { start: yearStart, end: yearEnd };
  const totalInterventions = agencyData.reduce((total, agency) => {
    if (!agency.data?.interventions) return total;
    const count = agency.data.interventions.filter((intervention: any) => {
      const date = intervention.date || intervention.created_at;
      if (!date) return false;
      const interventionDate = parseDate(date);
      return interventionDate && interventionDate >= calcRange.start && interventionDate <= calcRange.end;
    }).length;
    return total + count;
  }, 0);

  // Calculate average SAV rate (weighted average)
  const agencySAVRates: number[] = [];
  agencyData.forEach((agency) => {
    if (!agency.data?.projects || !agency.data?.interventions) return;
    if (!Array.isArray(agency.data.projects) || !Array.isArray(agency.data.interventions)) return;
    
    const projectIds = new Set(agency.data.projects.map((p: any) => p.id));
    const totalProjects = projectIds.size;
    if (totalProjects === 0) return;

    const savProjectIds = new Set();
    agency.data.interventions.forEach((intervention: any) => {
      if (intervention.type === 'sav' && projectIds.has(intervention.projectId)) {
        savProjectIds.add(intervention.projectId);
      }
    });

    const agencySAVRate = (savProjectIds.size / totalProjects) * 100;
    agencySAVRates.push(agencySAVRate);
    console.log(`📊 ${agency.agencyLabel}: ${agencySAVRate.toFixed(2)}% SAV (${savProjectIds.size}/${totalProjects})`);
  });
  const savRate = agencySAVRates.length > 0
    ? agencySAVRates.reduce((sum, rate) => sum + rate, 0) / agencySAVRates.length
    : 0;
  console.log(`📊 SAV Rate Average: ${savRate.toFixed(2)}% across ${agencySAVRates.length} agencies`);

  // Calculate average processing time
  let totalDays = 0;
  let projectCount = 0;
  agencyData.forEach((agency) => {
    if (!agency.data?.projects || !agency.data?.interventions) return;
    agency.data.projects.forEach((project: any) => {
      const projectCreatedAt = parseDate(project.createdAt || project.created_at);
      if (!projectCreatedAt) return;

      const projectInterventions = agency.data.interventions
        .filter((i: any) => i.projectId === project.id)
        .map((i: any) => parseDate(i.date || i.created_at))
        .filter((d: Date | null) => d !== null) as Date[];

      if (projectInterventions.length === 0) return;

      const lastIntervention = new Date(Math.max(...projectInterventions.map(d => d.getTime())));
      const daysDiff = Math.floor((lastIntervention.getTime() - projectCreatedAt.getTime()) / (1000 * 60 * 60 * 24));
      
      totalDays += daysDiff;
      projectCount += 1;
    });
  });
  const averageProcessingTime = projectCount > 0 ? Math.round(totalDays / projectCount) : 0;

  // Calculate TOP 5 agencies
  const agenciesWithCA = agencyData
    .map((agency) => {
      if (!agency.data?.factures) {
        return { agencyId: agency.agencyId, agencyLabel: agency.agencyLabel, ca: 0 };
      }

      const ca = agency.data.factures
        .filter((f: any) => {
          if (f.type === 'avoir') return false;
          const dateReelle = f.dateReelle || f.dateEmission || f.created_at;
          const factureDate = parseDate(dateReelle);
          return factureDate && factureDate >= yearStart && factureDate <= yearEnd;
        })
        .reduce((sum: number, f: any) => {
          const montantRaw = f.data?.totalHT || f.totalHT || f.montantHT || 0;
          const montant = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, '')) || 0;
          return sum + montant;
        }, 0);

      return { agencyId: agency.agencyId, agencyLabel: agency.agencyLabel, ca };
    })
    .sort((a, b) => b.ca - a.ca)
    .slice(0, 5)
    .map((agency, index) => ({ ...agency, rank: index + 1 }));

  // Calculate best apporteur
  const apporteurMap = new Map<number, { name: string; ca: number; nbDossiers: number }>();
  agencyData.forEach((agency) => {
    if (!agency.data?.factures || !agency.data?.clients || !agency.data?.projects) return;

    const clientsMap = new Map<number, any>(
      agency.data.clients.map((c: any) => [c.id, { 
        name: c.nom || c.prenom || "Apporteur sans nom",
        typeClient: c.data?.type 
      }])
    );

    const projectsMap = new Map(agency.data.projects.map((p: any) => [p.id, p]));

    agency.data.factures.forEach((facture: any) => {
      if (facture.type === 'avoir') return;
      const dateReelle = facture.dateReelle || facture.dateEmission || facture.created_at;
      const factureDate = parseDate(dateReelle);
      if (!factureDate || factureDate < yearStart || factureDate > yearEnd) return;

      const project = projectsMap.get(facture.projectId);
      if (!project) return;

      const projectData = (project as any).data || {};
      const commanditaireId = projectData.commanditaireId;
      if (!commanditaireId) return;

      const client = clientsMap.get(commanditaireId);
      if (!client) return;

      const existing = apporteurMap.get(commanditaireId) || { 
        name: client.name, 
        ca: 0, 
        nbDossiers: 0 
      };
      
      const montantRaw = facture.data?.totalHT || facture.totalHT || facture.montantHT || 0;
      const montant = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, '')) || 0;
      existing.ca += montant;
      
      apporteurMap.set(commanditaireId, existing);
    });
  });

  // Count projects per apporteur
  agencyData.forEach((agency) => {
    if (!agency.data?.projects) return;
    agency.data.projects.forEach((project: any) => {
      const projectData = project.data || {};
      const commanditaireId = projectData.commanditaireId;
      if (!commanditaireId) return;
      const existing = apporteurMap.get(commanditaireId);
      if (existing) existing.nbDossiers += 1;
    });
  });

  let bestApporteur = null;
  let maxCA = 0;
  apporteurMap.forEach((stats) => {
    if (stats.ca > maxCA) {
      maxCA = stats.ca;
      bestApporteur = stats;
    }
  });

  // Calculate monthly CA evolution
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  const monthlyCAEvolution = months.map((month, index) => ({ month, ca: 0, nbFactures: 0 }));
  agencyData.forEach((agency) => {
    if (!agency.data?.factures) return;
    agency.data.factures.forEach((facture: any) => {
      if (facture.type === 'avoir') return;
      const dateReelle = facture.dateReelle || facture.dateEmission || facture.created_at;
      const factureDate = parseDate(dateReelle);
      if (!factureDate || factureDate.getFullYear() !== now.getFullYear()) return;

      const monthIndex = factureDate.getMonth();
      const montantRaw = facture.data?.totalHT || facture.totalHT || facture.montantHT || 0;
      const montant = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, '')) || 0;
      
      monthlyCAEvolution[monthIndex].ca += montant;
      monthlyCAEvolution[monthIndex].nbFactures += 1;
    });
  });

  // Calculate CA by agency (for pie chart)
  const caByAgency = agencyData
    .map((agency) => {
      if (!agency.data?.factures) return { agencyLabel: agency.agencyLabel, ca: 0 };
      const ca = agency.data.factures
        .filter((f: any) => {
          if (f.type === 'avoir') return false;
          const dateReelle = f.dateReelle || f.dateEmission || f.created_at;
          const factureDate = parseDate(dateReelle);
          return factureDate && factureDate >= yearStart && factureDate <= yearEnd;
        })
        .reduce((sum: number, f: any) => {
          const montantRaw = f.data?.totalHT || f.totalHT || f.montantHT || 0;
          const montant = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, '')) || 0;
          return sum + montant;
        }, 0);
      return { agencyLabel: agency.agencyLabel, ca };
    })
    .filter(a => a.ca > 0)
    .sort((a, b) => b.ca - a.ca);

  // Calculate monthly SAV evolution
  const monthlySAVEvolution = months.map((month) => ({ month, tauxSAV: 0 }));
  months.forEach((_, monthIndex) => {
    const agencyRates: number[] = [];
    agencyData.forEach((agency) => {
      if (!agency.data?.projects || !agency.data?.interventions) return;

      const monthProjects = agency.data.projects.filter((p: any) => {
        const createdAt = parseDate(p.createdAt || p.created_at);
        return createdAt && createdAt.getFullYear() === now.getFullYear() && createdAt.getMonth() === monthIndex;
      });

      if (monthProjects.length === 0) return;

      const projectIds = new Set(monthProjects.map((p: any) => p.id));
      const savProjectIds = new Set();

      agency.data.interventions.forEach((intervention: any) => {
        if (intervention.type === 'sav' && projectIds.has(intervention.projectId)) {
          savProjectIds.add(intervention.projectId);
        }
      });

      const agencyRate = (savProjectIds.size / projectIds.size) * 100;
      agencyRates.push(agencyRate);
    });

    monthlySAVEvolution[monthIndex].tauxSAV = agencyRates.length > 0
      ? agencyRates.reduce((sum, rate) => sum + rate, 0) / agencyRates.length
      : 0;
  });

  return {
    totalCAYear,
    totalCAPeriod,
    totalProjects,
    agencyCount: agencyData.length,
    totalInterventions,
    savRate,
    monthlyRoyalties: 0, // Placeholder
    averageProcessingTime,
    top5Agencies: agenciesWithCA,
    bestApporteur,
    monthlyCAEvolution,
    caByAgency,
    monthlySAVEvolution,
  };
}

serve(async (req) => {
  // Handle CORS preflight or reject unauthorized origins
  const corsResult = handleCorsPreflightOrReject(req);
  if (corsResult) return corsResult;

  const origin = req.headers.get('origin') ?? '';
  const corsHeaders = isOriginAllowed(origin) ? getCorsHeaders(origin) : {};

  try {
    console.log('🔄 network-kpis: Request received');

    // Check cache
    const now = Date.now();
    if (cache && (now - cache.timestamp) < CACHE_DURATION) {
      console.log('✅ Returning cached data');
      return withCors(req, new Response(JSON.stringify(cache.data), {
        headers: { 'Content-Type': 'application/json' },
      }));
    }

    console.log('🔄 Cache expired or empty, loading fresh data');

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Rate limit: 20 req/min per user
    const rateLimitKey = `network-kpis:${user.id}`;
    const rateCheck = checkRateLimit(rateLimitKey, { limit: 20, windowMs: 60 * 1000 });
    if (!rateCheck.allowed) {
      console.log(`[NETWORK-KPIS] Rate limit exceeded for ${rateLimitKey}`);
      return rateLimitResponse(rateCheck.retryAfter!, corsHeaders);
    }

    // Get date range from request
    const body = await req.json().catch(() => ({}));
    const dateRange = body.dateRange ? {
      from: new Date(body.dateRange.from),
      to: new Date(body.dateRange.to),
    } : undefined;

    // Get all active agencies
    const { data: agencies } = await supabaseClient
      .from('apogee_agencies')
      .select('id, slug, label')
      .eq('is_active', true);

    if (!agencies || agencies.length === 0) {
      throw new Error('No active agencies found');
    }

    console.log(`🔄 Loading data for ${agencies.length} agencies`);

    // Load data for all agencies sequentially
    const agencyData = [];
    for (const agency of agencies) {
      console.log(`🔄 Loading ${agency.slug}...`);
      const data = await loadAgencyData(agency.slug);
      if (data) {
        agencyData.push({
          agencyId: agency.slug,
          agencyLabel: agency.label,
          data,
        });
        console.log(`✅ ${agency.slug}: loaded`);
      }
    }

    console.log(`✅ Loaded ${agencyData.length}/${agencies.length} agencies`);

    // Calculate all KPIs
    const kpis = calculateNetworkKPIs(agencyData, dateRange);

    // Update cache
    cache = {
      data: kpis,
      timestamp: now,
    };

    console.log('✅ KPIs calculated and cached');

    return withCors(req, new Response(JSON.stringify(kpis), {
      headers: { 'Content-Type': 'application/json' },
    }));

  } catch (error) {
    console.error('❌ Error in network-kpis:', error);
    return withCors(req, new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
});
