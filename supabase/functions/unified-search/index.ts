/**
 * Edge Function: unified-search
 * Pipeline déterministe NL → Métrique StatIA
 * Avec contrôle d'accès par rôle
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsPreflightOrReject, withCors, getCorsHeaders } from '../_shared/cors.ts';
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';

// ============= TYPES =============
interface ParsedPeriod {
  start: Date;
  end: Date;
  label: string;
  isDefault: boolean;
}

interface ParsedStatQuery {
  metricId: string;
  metricLabel: string;
  dimension: string;
  intentType: string;
  univers?: string;
  period?: ParsedPeriod;
  topN?: number;
  technicienName?: string;
  confidence: number;
  minRole: number;
  isRanking: boolean;
  debug: {
    detectedDimension: string;
    detectedIntent: string;
    detectedUnivers: string | null;
    detectedPeriod: string | null;
    routingPath: string;
  };
}

interface StatSearchResult {
  type: 'stat';
  metricId: string;
  metricLabel: string;
  filters: {
    univers?: string;
    periode?: { start: string; end: string; label: string; isDefault: boolean };
  };
  result: {
    value: number | string;
    topItem?: { id: string | number; name: string; value: number };
    ranking?: Array<{ rank: number; id: string | number; name: string; value: number }>;
    unit?: string;
  };
  agencySlug: string;
  agencyName?: string;
  computedAt: string;
  parsed?: ParsedStatQuery;
  accessDenied?: boolean;
  accessMessage?: string;
}

interface DocSearchResult {
  type: 'doc';
  results: Array<{
    id: string;
    title: string;
    snippet: string;
    url: string;
    source: string;
    similarity?: number;
  }>;
}

// ============= DICTIONNAIRES NL =============
const STATS_KEYWORDS = [
  'combien', 'ca', 'chiffre', "chiffre d'affaires", 
  'dossiers', 'en moyenne', 'moyenne', 'top', 'le plus', 
  'panier moyen', 'taux', 'nombre', 'nb', 
  'meilleur', 'meilleurs', 'premier', 'premiers',
  'technicien', 'apporteur', 'univers',
  'sav', 'transformation', 'devis',
  'stat', 'statistique', 'kpi', 'indicateur',
];

const UNIVERS_ALIASES: Record<string, string> = {
  'électricité': 'ELECTRICITE', 'electricite': 'ELECTRICITE', 'elec': 'ELECTRICITE',
  'électrique': 'ELECTRICITE', 'electrique': 'ELECTRICITE',
  'plomberie': 'PLOMBERIE', 'plombier': 'PLOMBERIE', 'fuite': 'PLOMBERIE',
  'serrurerie': 'SERRURERIE', 'serrurier': 'SERRURERIE', 'serrure': 'SERRURERIE',
  'vitrerie': 'VITRERIE', 'vitrier': 'VITRERIE', 'vitre': 'VITRERIE',
  'volet': 'VOLET', 'volets': 'VOLET', 'store': 'VOLET',
  'menuiserie': 'MENUISERIE', 'menuisier': 'MENUISERIE',
  'peinture': 'PEINTURE', 'peintre': 'PEINTURE',
  'carrelage': 'CARRELAGE', 'carreleur': 'CARRELAGE',
  'maçonnerie': 'MACONNERIE', 'maconnerie': 'MACONNERIE', 'maçon': 'MACONNERIE',
  'dépannage': 'DEPANNAGE', 'depannage': 'DEPANNAGE',
};

const MOIS_MAPPING: Record<string, number> = {
  'janvier': 0, 'jan': 0, 'janv': 0,
  'février': 1, 'fevrier': 1, 'fev': 1, 'fév': 1,
  'mars': 2, 'mar': 2,
  'avril': 3, 'avr': 3,
  'mai': 4,
  'juin': 5, 'jun': 5,
  'juillet': 6, 'juil': 6, 'jul': 6,
  'août': 7, 'aout': 7, 'aou': 7,
  'septembre': 8, 'sept': 8, 'sep': 8,
  'octobre': 9, 'oct': 9,
  'novembre': 10, 'nov': 10,
  'décembre': 11, 'decembre': 11, 'dec': 11, 'déc': 11,
};

const DIMENSION_KEYWORDS: Record<string, string[]> = {
  technicien: ['technicien', 'tech', 'ouvrier', 'intervenant', 'intervenants'],
  apporteur: ['apporteur', 'apporteurs', 'commanditaire', 'prescripteur', 'prescripteurs'],
  univers: ['univers', 'métier', 'metier', 'domaine'],
};

const INTENT_KEYWORDS: Record<string, string[]> = {
  top: ['top', 'meilleur', 'meilleurs', 'premier', 'premiers', 'le plus', 'les plus', 'qui a fait'],
  moyenne: ['en moyenne', 'moyenne', 'moyen', 'rapporte'],
  volume: ['combien', 'nombre de', 'nb de', 'volume'],
  taux: ['taux', 'pourcentage', '%'],
  valeur: ['total', 'global', 'fait'],
};

// Matrice de routing (dimension, intent) → métrique
interface MetricRouting {
  metricId: string;
  label: string;
  isRanking: boolean;
  minRole: number;
  defaultTopN?: number;
}

const METRIC_ROUTING_MATRIX: Record<string, Record<string, MetricRouting>> = {
  technicien: {
    top: { metricId: 'ca_par_technicien', label: 'Top techniciens par CA', isRanking: true, minRole: 2, defaultTopN: 5 },
    moyenne: { metricId: 'ca_moyen_par_tech', label: 'CA moyen par technicien', isRanking: false, minRole: 2 },
    valeur: { metricId: 'ca_par_technicien', label: 'CA par technicien', isRanking: true, minRole: 2 },
    volume: { metricId: 'interventions_par_technicien', label: 'Interventions par technicien', isRanking: true, minRole: 2 },
  },
  apporteur: {
    top: { metricId: 'ca_par_apporteur', label: 'Top apporteurs par CA', isRanking: true, minRole: 2, defaultTopN: 5 },
    valeur: { metricId: 'ca_par_apporteur', label: 'CA par apporteur', isRanking: true, minRole: 2 },
    volume: { metricId: 'dossiers_par_apporteur', label: 'Dossiers par apporteur', isRanking: true, minRole: 2 },
  },
  univers: {
    top: { metricId: 'ca_par_univers', label: 'Top univers par CA', isRanking: true, minRole: 0 },
    valeur: { metricId: 'ca_par_univers', label: 'CA par univers', isRanking: true, minRole: 0 },
    volume: { metricId: 'nb_dossiers_par_univers', label: 'Dossiers par univers', isRanking: true, minRole: 0 },
  },
  global: {
    top: { metricId: 'ca_global_ht', label: 'CA global HT', isRanking: false, minRole: 0 },
    valeur: { metricId: 'ca_global_ht', label: 'CA global HT', isRanking: false, minRole: 0 },
    volume: { metricId: 'nb_dossiers_crees', label: 'Nombre de dossiers', isRanking: false, minRole: 0 },
    taux: { metricId: 'taux_sav_global', label: 'Taux de SAV', isRanking: false, minRole: 0 },
    moyenne: { metricId: 'ca_moyen_par_tech', label: 'CA moyen par technicien', isRanking: false, minRole: 2 },
  },
};

const SPECIALIZED_METRICS: Array<{ keywords: string[]; metric: MetricRouting }> = [
  {
    keywords: ['sav', 'service après vente', 'garantie'],
    metric: { metricId: 'taux_sav_global', label: 'Taux de SAV', isRanking: false, minRole: 0 },
  },
  {
    keywords: ['transformation', 'taux devis', 'devis transformé'],
    metric: { metricId: 'taux_transformation_devis', label: 'Taux de transformation devis', isRanking: false, minRole: 0 },
  },
  {
    keywords: ['panier moyen', 'panier'],
    metric: { metricId: 'panier_moyen', label: 'Panier moyen', isRanking: false, minRole: 0 },
  },
];

// ============= ROLE LEVEL MAPPING =============
const ROLE_LEVELS: Record<string, number> = {
  'superadmin': 6,
  'platform_admin': 5,
  'franchisor_admin': 4,
  'franchisor_user': 3,
  'franchisee_admin': 2,
  'franchisee_user': 1,
  'base_user': 0,
};

function getRoleLevel(globalRole: string | null | undefined): number {
  if (!globalRole) return 0;
  return ROLE_LEVELS[globalRole] ?? 0;
}

// ============= PARSER FUNCTIONS =============
function isStatsQuery(query: string): boolean {
  const normalized = query.toLowerCase();
  return STATS_KEYWORDS.some(kw => normalized.includes(kw));
}

function extractUnivers(query: string): string | undefined {
  const normalized = query.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  
  for (const [alias, univers] of Object.entries(UNIVERS_ALIASES)) {
    const normalizedAlias = alias.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (normalized.includes(normalizedAlias)) {
      return univers;
    }
  }
  return undefined;
}

function getMonthName(monthIndex: number): string {
  const names = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  return names[monthIndex] || '';
}

function extractPeriode(query: string, now = new Date()): ParsedPeriod | undefined {
  const normalized = query.toLowerCase();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  if (normalized.includes('cette année') || normalized.includes('cette annee')) {
    return { start: new Date(currentYear, 0, 1), end: new Date(currentYear, 11, 31), 
             label: `Année ${currentYear}`, isDefault: false };
  }

  if (normalized.includes('année dernière') || normalized.includes("l'année dernière")) {
    return { start: new Date(currentYear - 1, 0, 1), end: new Date(currentYear - 1, 11, 31),
             label: `Année ${currentYear - 1}`, isDefault: false };
  }

  if (normalized.includes('ce mois')) {
    return { start: new Date(currentYear, currentMonth, 1), end: new Date(currentYear, currentMonth + 1, 0),
             label: `${getMonthName(currentMonth)} ${currentYear}`, isDefault: false };
  }

  if (normalized.includes('mois dernier')) {
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const year = currentMonth === 0 ? currentYear - 1 : currentYear;
    return { start: new Date(year, lastMonth, 1), end: new Date(year, lastMonth + 1, 0),
             label: `${getMonthName(lastMonth)} ${year}`, isDefault: false };
  }

  if (normalized.includes('12 derniers mois') || normalized.includes('douze derniers mois')) {
    const start = new Date(now);
    start.setMonth(start.getMonth() - 12);
    start.setDate(1);
    return { start, end: new Date(currentYear, currentMonth + 1, 0),
             label: '12 derniers mois', isDefault: false };
  }

  // Check for month names
  for (const [moisName, moisIndex] of Object.entries(MOIS_MAPPING)) {
    const patterns = [
      new RegExp(`en ${moisName}\\b`, 'i'),
      new RegExp(`mois de ${moisName}\\b`, 'i'),
      new RegExp(`au ${moisName}\\b`, 'i'),
      new RegExp(`sur ${moisName}\\b`, 'i'),
      new RegExp(`\\b${moisName}\\s+\\d{4}\\b`, 'i'),
      new RegExp(`\\b${moisName}\\b`, 'i'),
    ];

    for (const pattern of patterns) {
      if (pattern.test(normalized)) {
        const yearMatch = normalized.match(/20\d{2}/);
        const year = yearMatch ? parseInt(yearMatch[0]) : currentYear;
        return { start: new Date(year, moisIndex, 1), end: new Date(year, moisIndex + 1, 0),
                 label: `${getMonthName(moisIndex)} ${year}`, isDefault: false };
      }
    }
  }

  // Range pattern "juin / juillet"
  const rangeMatch = normalized.match(/(\w+)\s*(?:\/|à|a|-|et)\s*(\w+)/);
  if (rangeMatch) {
    const idx1 = MOIS_MAPPING[rangeMatch[1]];
    const idx2 = MOIS_MAPPING[rangeMatch[2]];
    if (idx1 !== undefined && idx2 !== undefined) {
      const yearMatch = normalized.match(/20\d{2}/);
      const year = yearMatch ? parseInt(yearMatch[0]) : currentYear;
      return { start: new Date(year, idx1, 1), end: new Date(year, idx2 + 1, 0),
               label: `${getMonthName(idx1)} - ${getMonthName(idx2)} ${year}`, isDefault: false };
    }
  }

  return undefined;
}

function extractTopN(query: string): number | undefined {
  const patterns = [/top\s*(\d+)/i, /(\d+)\s*(?:meilleur|premier)/i, /les\s*(\d+)\s*(?:meilleur|premier)/i];
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match) return Math.min(parseInt(match[1], 10), 20);
  }
  if (query.toLowerCase().includes('meilleur') || query.toLowerCase().includes('top')) return 3;
  return undefined;
}

function extractTechnicienName(query: string): string | undefined {
  const reserved = new Set(['ca', 'janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 
    'août', 'septembre', 'octobre', 'novembre', 'décembre', 'electricite', 'plomberie', 
    'serrurerie', 'vitrerie', 'volet', 'top', 'meilleur', 'technicien', 'tech', 'apporteur', 
    'univers', 'dossier', 'combien', 'moyenne', 'sav']);

  const words = query.split(/\s+/);
  for (const word of words) {
    const cleanWord = word.replace(/[^a-zA-ZÀ-ÿ]/g, '');
    if (cleanWord.length > 2 && cleanWord[0] === cleanWord[0].toUpperCase() && 
        !reserved.has(cleanWord.toLowerCase())) {
      return cleanWord;
    }
  }
  return undefined;
}

function detectDimension(query: string): string {
  const normalized = query.toLowerCase();
  for (const [dimension, keywords] of Object.entries(DIMENSION_KEYWORDS)) {
    if (keywords.some(kw => normalized.includes(kw))) return dimension;
  }
  if (extractUnivers(query)) return 'univers';
  return 'global';
}

function detectIntent(query: string): string {
  const normalized = query.toLowerCase();
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (keywords.some(kw => normalized.includes(kw))) return intent;
  }
  return 'valeur';
}

function routeToMetric(dimension: string, intent: string, query: string): MetricRouting {
  const normalized = query.toLowerCase();
  for (const special of SPECIALIZED_METRICS) {
    if (special.keywords.some(kw => normalized.includes(kw))) return special.metric;
  }

  const dimensionRoutes = METRIC_ROUTING_MATRIX[dimension];
  if (dimensionRoutes?.[intent]) return dimensionRoutes[intent];
  if (dimensionRoutes?.['valeur']) return dimensionRoutes['valeur'];

  return { metricId: 'ca_global_ht', label: 'CA global HT', isRanking: false, minRole: 0 };
}

function parseStatQuery(query: string, now = new Date()): ParsedStatQuery | null {
  if (!isStatsQuery(query)) return null;

  const dimension = detectDimension(query);
  const intent = detectIntent(query);
  const univers = extractUnivers(query);
  let period = extractPeriode(query, now);
  const topN = extractTopN(query);
  const technicienName = extractTechnicienName(query);

  const routing = routeToMetric(dimension, intent, query);

  // Default period for rankings
  if (routing.isRanking && !period) {
    period = {
      start: new Date(now.getFullYear(), 0, 1),
      end: new Date(now.getFullYear(), 11, 31),
      label: `Année ${now.getFullYear()}`,
      isDefault: true,
    };
  }

  let confidence = 0.5;
  if (univers) confidence += 0.15;
  if (period && !period.isDefault) confidence += 0.2;
  if (topN) confidence += 0.1;
  if (dimension !== 'global') confidence += 0.05;

  return {
    metricId: routing.metricId,
    metricLabel: routing.label,
    dimension,
    intentType: intent,
    univers,
    period,
    topN: topN || routing.defaultTopN,
    technicienName,
    confidence: Math.min(confidence, 1),
    minRole: routing.minRole,
    isRanking: routing.isRanking,
    debug: {
      detectedDimension: dimension,
      detectedIntent: intent,
      detectedUnivers: univers || null,
      detectedPeriod: period ? period.label : null,
      routingPath: `${dimension}.${intent} → ${routing.metricId}`,
    },
  };
}

// ============= MAIN HANDLER =============
serve(async (req) => {
  const corsResponse = handleCorsPreflightOrReject(req);
  if (corsResponse) return corsResponse;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return withCors(req, new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      }));
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return withCors(req, new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      }));
    }

    const origin = req.headers.get('origin') ?? '';
    const corsHeaders = getCorsHeaders(origin);
    const rateLimitResult = await checkRateLimit(`unified-search:${user.id}`, { limit: 30, windowMs: 60000 });
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.retryAfter || 60, corsHeaders);
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('agence, enabled_modules, global_role, first_name, last_name')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error(`[unified-search] Profile fetch error:`, profileError);
    }

    const globalRole = profile?.global_role || 'base_user';
    const userRoleLevel = getRoleLevel(globalRole);
    const agencySlug = profile?.agence || '';
    
    console.log(`[unified-search] User id=${user.id}, role=${globalRole} (level=${userRoleLevel}), agence=${agencySlug || 'none'}`);

    const { query } = await req.json();
    if (!query || typeof query !== 'string') {
      return withCors(req, new Response(JSON.stringify({ error: 'Query required' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      }));
    }

    // Use deterministic parser
    const parsedQuery = parseStatQuery(query);
    
    console.log(`[unified-search] Query: "${query}", Parsed: ${parsedQuery ? 'yes' : 'no (docs mode)'}`);

    if (parsedQuery) {
      console.log(`[unified-search] Stats routing: ${parsedQuery.debug.routingPath}, minRole=${parsedQuery.minRole}, userLevel=${userRoleLevel}`);

      // === ACCESS CONTROL ===
      if (userRoleLevel < parsedQuery.minRole) {
        console.log(`[unified-search] Access denied: user level ${userRoleLevel} < required ${parsedQuery.minRole}`);
        const result: StatSearchResult = {
          type: 'stat',
          metricId: parsedQuery.metricId,
          metricLabel: parsedQuery.metricLabel,
          filters: {},
          result: { value: 0 },
          agencySlug,
          agencyName: agencySlug ? agencySlug.toUpperCase() : undefined,
          computedAt: new Date().toISOString(),
          parsed: parsedQuery,
          accessDenied: true,
          accessMessage: 'Vous n\'avez pas accès à cette statistique. Contactez votre responsable.',
        };
        return withCors(req, new Response(JSON.stringify(result), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        }));
      }

      // === COMPUTE STATS ===
      let computedValue: number = 0;
      let topItem: { id: string | number; name: string; value: number } | undefined;
      let ranking: Array<{ rank: number; id: string | number; name: string; value: number }> | undefined;

      if (agencySlug) {
        try {
          const proxyUrl = `${supabaseUrl}/functions/v1/proxy-apogee`;
          const periode = parsedQuery.period;

          // Fetch factures
          const facturesResponse = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
            body: JSON.stringify({
              endpoint: 'apiGetFactures',
              agencySlug,
              filters: periode ? {
                dateDebut: periode.start.toISOString().split('T')[0],
                dateFin: periode.end.toISOString().split('T')[0],
              } : {},
            }),
          });

          // Fetch additional data based on metric type
          let projects: Array<{ id: number; data?: { commanditaireId?: number; universes?: string[] } }> = [];
          let clients: Array<{ id: number; name?: string; raisonSociale?: string }> = [];

          if (parsedQuery.metricId.includes('apporteur') || parsedQuery.metricId.includes('univers')) {
            const [projectsRes, clientsRes] = await Promise.all([
              fetch(proxyUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
                body: JSON.stringify({ endpoint: 'apiGetProjects', agencySlug }),
              }),
              fetch(proxyUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
                body: JSON.stringify({ endpoint: 'apiGetClients', agencySlug }),
              }),
            ]);
            if (projectsRes.ok) projects = (await projectsRes.json()).data || [];
            if (clientsRes.ok) clients = (await clientsRes.json()).data || [];
          }

          if (facturesResponse.ok) {
            const proxyData = await facturesResponse.json();
            console.log(`[unified-search] Got ${proxyData.data?.length || 0} factures, ${projects.length} projects, ${clients.length} clients`);

            if (proxyData.success && proxyData.data) {
              const factures = proxyData.data as Array<{
                id?: number;
                totalHT?: number; montant?: number; typeFacture?: string;
                dateReelle?: string; date?: string; projectId?: number;
                data?: { 
                  totalHT?: number;
                  technicians?: Array<{ id: number; firstname?: string; lastname?: string; bgcolor?: { hex?: string } }>;
                };
              }>;

              // Filter by period
              const filteredFactures = factures.filter(f => {
                const factureDate = f.dateReelle || f.date;
                if (!factureDate || !periode) return true;
                const d = new Date(factureDate);
                return d >= periode.start && d <= periode.end;
              });

              console.log(`[unified-search] Filtered factures: ${filteredFactures.length} (period: ${periode?.label || 'none'})`);
              
              // Debug first few factures
              if (filteredFactures.length > 0) {
                const sample = filteredFactures.slice(0, 3).map(f => ({
                  id: f.id,
                  projectId: f.projectId,
                  totalHT: f.totalHT,
                  dataTotalHT: f.data?.totalHT,
                  montant: f.montant,
                  date: f.dateReelle || f.date,
                }));
                console.log(`[unified-search] Sample factures:`, JSON.stringify(sample));
              }

              const projectsById = new Map(projects.map(p => [p.id, p]));
              // Create clients map with both string and number keys for robust lookup
              // Build apporteur name map exactly like StatIA apporteurs.ts mapApporteurs()
              const apporteurNames = new Map<string, string>();
              for (const c of clients) {
                const id = String(c.id);
                const cAny = c as any;
                // Same priority as StatIA: displayName → raisonSociale → nom → name → label → data.nom → data.name
                const nom = 
                  cAny.displayName ||
                  c.raisonSociale ||
                  cAny.nom ||
                  c.name ||
                  cAny.label ||
                  cAny.data?.nom ||
                  cAny.data?.name ||
                  cAny.data?.raisonSociale ||
                  `Apporteur ${id}`;
                apporteurNames.set(id, nom);
              }

              // === CA PAR APPORTEUR ===
              if (parsedQuery.metricId === 'ca_par_apporteur') {
                const caByApporteur: Record<number, { name: string; ca: number }> = {};
                let facturesWithProject = 0;
                let facturesWithApporteur = 0;
                
                for (const f of filteredFactures) {
                  const isAvoir = (f.typeFacture || '').toLowerCase() === 'avoir';
                  // Use data.totalHT first (as per rules), fallback to totalHT then montant
                  const montant = f.data?.totalHT ?? f.totalHT ?? f.montant ?? 0;
                  const netMontant = isAvoir ? -Math.abs(montant) : montant;
                  
                  const project = projectsById.get(f.projectId || 0);
                  if (project) facturesWithProject++;
                  
                  const commanditaireId = project?.data?.commanditaireId;
                  
                  if (commanditaireId) {
                    facturesWithApporteur++;
                    const name = apporteurNames.get(String(commanditaireId)) || `Apporteur #${commanditaireId}`;
                    if (!caByApporteur[commanditaireId]) caByApporteur[commanditaireId] = { name, ca: 0 };
                    caByApporteur[commanditaireId].ca += netMontant;
                  } else {
                    // Direct - no apporteur
                    if (!caByApporteur[0]) caByApporteur[0] = { name: 'Direct', ca: 0 };
                    caByApporteur[0].ca += netMontant;
                  }
                }

                console.log(`[unified-search] Apporteur calc: ${facturesWithProject}/${filteredFactures.length} with project, ${facturesWithApporteur} with apporteur`);
                console.log(`[unified-search] CA by apporteur keys: ${Object.keys(caByApporteur).length}`);

                const sorted = Object.entries(caByApporteur)
                  .map(([id, d]) => ({ id: parseInt(id), name: d.name, value: Math.round(d.ca) }))
                  .filter(x => x.value > 0)
                  .sort((a, b) => b.value - a.value);

                const limitN = parsedQuery.topN || 10;
                ranking = sorted.slice(0, limitN).map((item, idx) => ({ rank: idx + 1, ...item }));
                topItem = ranking[0];
                computedValue = sorted.reduce((sum, item) => sum + item.value, 0);
                
                console.log(`[unified-search] Top 3 apporteurs:`, ranking?.slice(0, 3));
              }
              // === CA PAR UNIVERS ===
              else if (parsedQuery.metricId === 'ca_par_univers') {
                const caByUnivers: Record<string, number> = {};
                for (const f of filteredFactures) {
                  const isAvoir = (f.typeFacture || '').toLowerCase() === 'avoir';
                  const montant = f.totalHT ?? f.montant ?? 0;
                  const netMontant = isAvoir ? -Math.abs(montant) : montant;
                  
                  const project = projectsById.get(f.projectId || 0);
                  const universes = project?.data?.universes || ['Non catégorisé'];
                  const share = netMontant / universes.length;
                  
                  for (const uni of universes) {
                    if (!caByUnivers[uni]) caByUnivers[uni] = 0;
                    caByUnivers[uni] += share;
                  }
                }

                const sorted = Object.entries(caByUnivers)
                  .map(([name, ca]) => ({ id: name, name, value: Math.round(ca) }))
                  .filter(x => x.value > 0)
                  .sort((a, b) => b.value - a.value);

                const limitN = parsedQuery.topN || 10;
                ranking = sorted.slice(0, limitN).map((item, idx) => ({ rank: idx + 1, ...item }));
                topItem = ranking[0];
                computedValue = sorted.reduce((sum, item) => sum + item.value, 0);
              }
              // === CA PAR TECHNICIEN ===
              else if (parsedQuery.metricId === 'ca_par_technicien') {
                const caByTech: Record<number, { name: string; ca: number }> = {};
                for (const f of filteredFactures) {
                  const isAvoir = (f.typeFacture || '').toLowerCase() === 'avoir';
                  const montant = f.totalHT ?? f.montant ?? 0;
                  const netMontant = isAvoir ? -Math.abs(montant) : montant;
                  const techs = f.data?.technicians || [];
                  
                  if (techs.length === 0) continue;
                  const share = netMontant / techs.length;
                  
                  for (const tech of techs) {
                    const name = `${tech.firstname || ''} ${tech.lastname || ''}`.trim() || `Tech #${tech.id}`;
                    if (!caByTech[tech.id]) caByTech[tech.id] = { name, ca: 0 };
                    caByTech[tech.id].ca += share;
                  }
                }

                const sorted = Object.entries(caByTech)
                  .map(([id, d]) => ({ id: parseInt(id), name: d.name, value: Math.round(d.ca) }))
                  .filter(x => x.value > 0)
                  .sort((a, b) => b.value - a.value);

                const limitN = parsedQuery.topN || 10;
                ranking = sorted.slice(0, limitN).map((item, idx) => ({ rank: idx + 1, ...item }));
                topItem = ranking[0];
                computedValue = sorted.reduce((sum, item) => sum + item.value, 0);
              }
              // === CA GLOBAL ===
              else {
                for (const f of filteredFactures) {
                  const isAvoir = (f.typeFacture || '').toLowerCase() === 'avoir';
                  const montant = f.totalHT ?? f.montant ?? 0;
                  computedValue += isAvoir ? -Math.abs(montant) : montant;
                }
                computedValue = Math.round(computedValue);
              }

              console.log(`[unified-search] Computed: ${computedValue}€ (metric=${parsedQuery.metricId})`);
            }
          } else {
            console.error(`[unified-search] Proxy error: ${facturesResponse.status}`);
          }
        } catch (apiError) {
          console.error(`[unified-search] API call failed:`, apiError);
        }
      } else {
        console.log(`[unified-search] No agency slug, cannot compute stats`);
      }

      const result: StatSearchResult = {
        type: 'stat',
        metricId: parsedQuery.metricId,
        metricLabel: parsedQuery.metricLabel,
        filters: {
          univers: parsedQuery.univers,
          periode: parsedQuery.period ? {
            start: parsedQuery.period.start.toISOString(),
            end: parsedQuery.period.end.toISOString(),
            label: parsedQuery.period.label,
            isDefault: parsedQuery.period.isDefault,
          } : undefined,
        },
        result: {
          value: computedValue,
          topItem,
          ranking,
          unit: parsedQuery.metricId.includes('taux') ? '%' : '€',
        },
        agencySlug,
        agencyName: agencySlug ? agencySlug.toUpperCase() : undefined,
        computedAt: new Date().toISOString(),
        parsed: parsedQuery,
      };

      return withCors(req, new Response(JSON.stringify(result), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      }));
    }

    // === DOCS MODE ===
    const { data: chunks } = await supabase
      .from('guide_chunks')
      .select('id, title, content, block_type, slug')
      .textSearch('content', query.split(' ').join(' & '))
      .limit(5);

    const { data: faqItems } = await supabase
      .from('faq_items')
      .select('id, question, answer, context_type')
      .textSearch('question', query.split(' ').join(' | '))
      .eq('is_published', true)
      .limit(3);

    const docResults: DocSearchResult['results'] = [];

    if (chunks) {
      for (const chunk of chunks) {
        const sourceMap: Record<string, string> = {
          'apogee': 'apogee', 'helpconfort': 'helpconfort', 'apporteurs': 'apporteurs',
        };
        docResults.push({
          id: chunk.id,
          title: chunk.title || 'Document',
          snippet: chunk.content?.substring(0, 200) + '...',
          url: chunk.slug ? `/academy/apogee/category/${chunk.slug}` : '/academy',
          source: sourceMap[chunk.block_type] || 'apogee',
        });
      }
    }

    if (faqItems) {
      for (const faq of faqItems) {
        docResults.push({
          id: faq.id,
          title: faq.question,
          snippet: faq.answer?.substring(0, 200) + '...',
          url: '/support/helpcenter',
          source: 'faq',
        });
      }
    }

    if (docResults.length === 0) {
      return withCors(req, new Response(JSON.stringify({
        type: 'fallback',
        message: 'Je n\'ai pas trouvé de réponse claire à cette question.',
      }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      }));
    }

    const result: DocSearchResult = { type: 'doc', results: docResults };
    return withCors(req, new Response(JSON.stringify(result), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }));

  } catch (error) {
    console.error('[unified-search] Error:', error);
    return withCors(req, new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal error' 
    }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    }));
  }
});
