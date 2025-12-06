/**
 * Edge Function: unified-search
 * Orchestre la recherche unifiée (Stats + Docs) en analysant l'intent de la requête
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsPreflightOrReject, withCors, getCorsHeaders } from '../_shared/cors.ts';
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';

// Types
interface StatSearchResult {
  type: 'stat';
  metricId: string;
  metricLabel: string;
  filters: {
    univers?: string;
    periode?: { start: string; end: string };
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

interface FallbackSearchResult {
  type: 'fallback';
  message: string;
}

// Mapping NL simplifié pour les stats
const STAT_KEYWORDS = [
  'combien', 'ca', 'chiffre', 'dossiers', 'en moyenne',
  'le plus', 'top', 'meilleur', 'technicien', 'taux',
  'sav', 'transformation', 'volume', 'nombre', 'rapporte',
  'statistique', 'stat', 'kpi', 'indicateur',
];

const UNIVERS_MAPPING: Record<string, string> = {
  'électricité': 'electricite', 'electricite': 'electricite', 'elec': 'electricite',
  'plomberie': 'plomberie', 'plombier': 'plomberie',
  'serrurerie': 'serrurerie', 'serrurier': 'serrurerie',
  'vitrerie': 'vitrerie', 'vitrier': 'vitrerie',
  'volet': 'volet_roulant', 'volets': 'volet_roulant',
};

const MOIS_MAPPING: Record<string, number> = {
  'janvier': 0, 'février': 1, 'mars': 2, 'avril': 3,
  'mai': 4, 'juin': 5, 'juillet': 6, 'août': 7,
  'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11,
};

function detectIntent(query: string): 'stats' | 'docs' {
  const normalized = query.toLowerCase();
  const isStats = STAT_KEYWORDS.some(kw => normalized.includes(kw));
  return isStats ? 'stats' : 'docs';
}

function extractUnivers(query: string): string | undefined {
  const normalized = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [kw, univers] of Object.entries(UNIVERS_MAPPING)) {
    if (normalized.includes(kw.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))) {
      return univers;
    }
  }
  return undefined;
}

function extractPeriode(query: string): { start: Date; end: Date } | undefined {
  const normalized = query.toLowerCase();
  const now = new Date();
  const year = now.getFullYear();

  if (normalized.includes('cette année')) {
    return { start: new Date(year, 0, 1), end: new Date(year, 11, 31) };
  }
  if (normalized.includes('ce mois')) {
    return { start: new Date(year, now.getMonth(), 1), end: new Date(year, now.getMonth() + 1, 0) };
  }

  for (const [moisName, moisIndex] of Object.entries(MOIS_MAPPING)) {
    if (normalized.includes(moisName) || normalized.includes(`${moisName} `)) {
      return { start: new Date(year, moisIndex, 1), end: new Date(year, moisIndex + 1, 0) };
    }
  }

  // Range pattern: "juin / juillet"
  const rangeMatch = normalized.match(/(\w+)\s*(?:\/|à|et)\s*(\w+)/);
  if (rangeMatch) {
    const idx1 = MOIS_MAPPING[rangeMatch[1]];
    const idx2 = MOIS_MAPPING[rangeMatch[2]];
    if (idx1 !== undefined && idx2 !== undefined) {
      return { start: new Date(year, idx1, 1), end: new Date(year, idx2 + 1, 0) };
    }
  }

  return undefined;
}

function extractTechnicienName(query: string): string | undefined {
  // Look for capitalized words that are likely names (not months or universes)
  const reservedWords = new Set([
    'ca', 'janvier', 'février', 'mars', 'avril', 'mai', 'juin', 
    'juillet', 'août', 'aout', 'septembre', 'octobre', 'novembre', 'décembre',
    'electricite', 'électricité', 'plomberie', 'serrurerie', 'vitrerie', 
    'volet', 'volets', 'top', 'meilleur', 'technicien', 'tech',
  ]);
  
  // Split by spaces and look for words that start with uppercase (proper nouns)
  const words = query.split(/\s+/);
  for (const word of words) {
    const cleanWord = word.replace(/[^a-zA-ZÀ-ÿ]/g, '');
    if (cleanWord.length > 2 && 
        cleanWord[0] === cleanWord[0].toUpperCase() &&
        !reservedWords.has(cleanWord.toLowerCase())) {
      return cleanWord;
    }
  }
  
  return undefined;
}

function extractTopN(query: string): number | undefined {
  // Extract number from queries like "top 3", "3 meilleurs", "les 5 premiers"
  const match = query.match(/(?:top\s*)?(\d+)\s*(?:meilleur|premier|top)/i) ||
                query.match(/top\s*(\d+)/i) ||
                query.match(/(\d+)\s*(?:meilleur|premier)/i);
  if (match) return parseInt(match[1], 10);
  
  // Default to 3 for "meilleurs" without number
  if (query.toLowerCase().includes('meilleur')) return 3;
  return undefined;
}

function detectMetricId(query: string, hasTechnicienFilter: boolean): { metricId: string; metricLabel: string; isRanking: boolean } {
  const normalized = query.toLowerCase();

  // If a technician name is detected, route to technician CA
  if (hasTechnicienFilter) {
    return { metricId: 'ca_technicien_filtre', metricLabel: 'CA du technicien', isRanking: false };
  }
  
  // Apporteur detection - MUST be before technicien to avoid false matches
  if (normalized.includes('apporteur') || normalized.includes('commanditaire') || normalized.includes('prescripteur')) {
    const isTop = normalized.includes('top') || normalized.includes('meilleur') || normalized.includes('plus');
    return { 
      metricId: 'ca_par_apporteur', 
      metricLabel: isTop ? 'Top apporteurs par CA' : 'CA par apporteur',
      isRanking: isTop 
    };
  }
  
  // Univers detection
  if (normalized.includes('univers') || normalized.includes('metier') || normalized.includes('domaine')) {
    const isTop = normalized.includes('top') || normalized.includes('meilleur') || normalized.includes('plus');
    return { 
      metricId: 'ca_par_univers', 
      metricLabel: isTop ? 'Top univers par CA' : 'CA par univers',
      isRanking: isTop 
    };
  }
  
  if ((normalized.includes('technicien') || normalized.includes('tech')) && 
      (normalized.includes('plus') || normalized.includes('top') || normalized.includes('meilleur'))) {
    return { metricId: 'ca_par_technicien', metricLabel: 'CA par technicien', isRanking: true };
  }
  if (normalized.includes('moyenne') || normalized.includes('rapporte')) {
    return { metricId: 'ca_moyen_par_tech', metricLabel: 'CA moyen par technicien', isRanking: false };
  }
  if (normalized.includes('dossier')) {
    return { metricId: 'nb_dossiers_crees', metricLabel: 'Nombre de dossiers', isRanking: false };
  }
  if (normalized.includes('sav')) {
    return { metricId: 'taux_sav_global', metricLabel: 'Taux de SAV', isRanking: false };
  }
  if (normalized.includes('transformation') || normalized.includes('devis')) {
    return { metricId: 'taux_transformation_devis', metricLabel: 'Taux de transformation', isRanking: false };
  }
  
  return { metricId: 'ca_global_ht', metricLabel: 'CA global HT', isRanking: false };
}

serve(async (req) => {
  // CORS preflight
  const corsResponse = handleCorsPreflightOrReject(req);
  if (corsResponse) return corsResponse;

  try {
    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return withCors(req, new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }));
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return withCors(req, new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }));
    }

    // Rate limit
    const origin = req.headers.get('origin') ?? '';
    const corsHeaders = getCorsHeaders(origin);
    const rateLimitResult = await checkRateLimit(`unified-search:${user.id}`, { limit: 30, windowMs: 60000 });
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.retryAfter || 60, corsHeaders);
    }

    // Get user profile for agency
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('agence, enabled_modules, global_role, full_name')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error(`[unified-search] Profile fetch error:`, profileError);
    }

    // Log user info for debugging - unified search is open to ALL authenticated users
    const globalRole = profile?.global_role || 'unknown';
    console.log(`[unified-search] User id=${user.id}, role=${globalRole}, agence=${profile?.agence || 'none'}`);

    // For stats queries, agency is needed - use empty string for franchiseur roles
    const agencySlug = profile?.agence || '';

    // Parse request
    const { query } = await req.json();
    if (!query || typeof query !== 'string') {
      return withCors(req, new Response(JSON.stringify({ error: 'Query required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }));
    }

    const intent = detectIntent(query);
    console.log(`[unified-search] Query: "${query}", Intent: ${intent}, Agency: "${agencySlug}", Role: ${profile?.global_role}`);

    // === STATS MODE ===
    if (intent === 'stats') {
      const technicienName = extractTechnicienName(query);
      const { metricId, metricLabel, isRanking } = detectMetricId(query, !!technicienName);
      const univers = extractUnivers(query);
      let periode = extractPeriode(query);
      const topN = extractTopN(query);

      // Default to current year for ranking queries without period
      if (isRanking && !periode) {
        const now = new Date();
        periode = { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 11, 31) };
        console.log(`[unified-search] No period specified for ranking, defaulting to current year`);
      }

      console.log(`[unified-search] Stats: metric=${metricId}, technicien=${technicienName || 'none'}, univers=${univers || 'none'}, periode=${periode ? 'yes' : 'none'}, topN=${topN || 'none'}, isRanking=${isRanking}`);

      // Compute real CA from Apogée API
      let computedValue: number = 0;
      let topItem: { id: string | number; name: string; value: number } | undefined;
      let ranking: Array<{ rank: number; id: string | number; name: string; value: number }> | undefined;

      if (agencySlug) {
        try {
          // For apporteur queries, we need projects to get commanditaireId
          const needsProjects = metricId === 'ca_par_apporteur';
          const needsClients = metricId === 'ca_par_apporteur';
          
          // Call proxy-apogee to get real factures data
          const proxyUrl = `${supabaseUrl}/functions/v1/proxy-apogee`;
          
          // Fetch factures
          const facturesResponse = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': authHeader,
            },
            body: JSON.stringify({
              endpoint: 'apiGetFactures',
              agencySlug: agencySlug,
              filters: periode ? {
                dateDebut: periode.start.toISOString().split('T')[0],
                dateFin: periode.end.toISOString().split('T')[0],
              } : {},
            }),
          });

          let projects: Array<{ id: number; data?: { commanditaireId?: number } }> = [];
          let clients: Array<{ id: number; name?: string; raisonSociale?: string }> = [];

          // Fetch projects if needed
          if (needsProjects) {
            const projectsResponse = await fetch(proxyUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
              body: JSON.stringify({ endpoint: 'apiGetProjects', agencySlug }),
            });
            if (projectsResponse.ok) {
              const pData = await projectsResponse.json();
              projects = pData.data || [];
            }
          }

          // Fetch clients if needed
          if (needsClients) {
            const clientsResponse = await fetch(proxyUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
              body: JSON.stringify({ endpoint: 'apiGetClients', agencySlug }),
            });
            if (clientsResponse.ok) {
              const cData = await clientsResponse.json();
              clients = cData.data || [];
            }
          }

          if (facturesResponse.ok) {
            const proxyData = await facturesResponse.json();
            console.log(`[unified-search] Got ${proxyData.data?.length || 0} factures from proxy`);

            if (proxyData.success && proxyData.data) {
              const factures = proxyData.data as Array<{
                totalHT?: number;
                montant?: number;
                typeFacture?: string;
                dateReelle?: string;
                date?: string;
                projectId?: number;
                data?: { technicians?: Array<{ id: number; firstname?: string; lastname?: string }> };
              }>;

              // Filter by period if specified
              const filteredFactures = factures.filter(f => {
                const factureDate = f.dateReelle || f.date;
                if (!factureDate || !periode) return true;
                const d = new Date(factureDate);
                return d >= periode.start && d <= periode.end;
              });

              // === CA PAR APPORTEUR ===
              if (metricId === 'ca_par_apporteur') {
                const projectsById = new Map(projects.map(p => [p.id, p]));
                const clientsById = new Map(clients.map(c => [c.id, c]));
                const caByApporteur: Record<number, { name: string; ca: number }> = {};

                for (const f of filteredFactures) {
                  const isAvoir = (f.typeFacture || '').toLowerCase() === 'avoir';
                  const montant = f.totalHT ?? f.montant ?? 0;
                  const netMontant = isAvoir ? -Math.abs(montant) : montant;
                  
                  const project = projectsById.get(f.projectId || 0);
                  const commanditaireId = project?.data?.commanditaireId;
                  
                  if (commanditaireId) {
                    const client = clientsById.get(commanditaireId);
                    const apporteurName = client?.raisonSociale || client?.name || `Apporteur #${commanditaireId}`;
                    
                    if (!caByApporteur[commanditaireId]) {
                      caByApporteur[commanditaireId] = { name: apporteurName, ca: 0 };
                    }
                    caByApporteur[commanditaireId].ca += netMontant;
                  } else {
                    // Direct (no apporteur)
                    if (!caByApporteur[0]) {
                      caByApporteur[0] = { name: 'Direct', ca: 0 };
                    }
                    caByApporteur[0].ca += netMontant;
                  }
                }

                // Sort and build ranking
                const sorted = Object.entries(caByApporteur)
                  .map(([id, data]) => ({ id: parseInt(id), name: data.name, value: Math.round(data.ca) }))
                  .sort((a, b) => b.value - a.value);

                const limitedRanking = topN ? sorted.slice(0, topN) : sorted.slice(0, 10);
                ranking = limitedRanking.map((item, idx) => ({ rank: idx + 1, ...item }));
                topItem = ranking[0];
                computedValue = sorted.reduce((sum, item) => sum + item.value, 0);

                console.log(`[unified-search] Computed ${sorted.length} apporteurs, top=${topItem?.name} (${topItem?.value}€)`);
              }
              // === CA PAR TECHNICIEN ===
              else if (technicienName) {
                // Filter factures for specific technician
                let techCA = 0;
                for (const f of filteredFactures) {
                  const techs = f.data?.technicians || [];
                  const isAvoir = (f.typeFacture || '').toLowerCase() === 'avoir';
                  const montant = f.totalHT ?? f.montant ?? 0;
                  const netMontant = isAvoir ? -Math.abs(montant) : montant;
                  
                  const matchingTech = techs.find(t => {
                    const fullName = `${t.firstname || ''} ${t.lastname || ''}`.toLowerCase();
                    return fullName.includes(technicienName.toLowerCase()) || 
                           (t.lastname || '').toLowerCase() === technicienName.toLowerCase();
                  });
                  
                  if (matchingTech && techs.length > 0) {
                    techCA += netMontant / techs.length;
                  }
                }
                computedValue = Math.round(techCA);
                topItem = { id: 1, name: technicienName, value: computedValue };
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

              console.log(`[unified-search] Computed CA: ${computedValue}€ from ${filteredFactures.length} factures`);
            }
          } else {
            console.error(`[unified-search] Proxy error: ${facturesResponse.status}`);
          }
        } catch (apiError) {
          console.error(`[unified-search] API call failed:`, apiError);
        }
      }

      const result: StatSearchResult = {
        type: 'stat',
        metricId,
        metricLabel: technicienName ? `CA de ${technicienName}` : metricLabel,
        filters: {
          univers,
          periode: periode ? {
            start: periode.start.toISOString(),
            end: periode.end.toISOString(),
          } : undefined,
        },
        result: {
          value: computedValue,
          topItem,
          ranking,
          unit: metricId.includes('taux') ? '%' : '€',
        },
        agencySlug: agencySlug,
        agencyName: agencySlug && agencySlug.length > 0 ? agencySlug.toUpperCase() : undefined,
        computedAt: new Date().toISOString(),
      };

      return withCors(req, new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));
    }

    // === DOCS MODE ===
    // Search in guide_chunks (RAG) and faq_items
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

    // Add guide chunks
    if (chunks) {
      for (const chunk of chunks) {
        const sourceMap: Record<string, string> = {
          'apogee': 'apogee',
          'helpconfort': 'helpconfort',
          'apporteurs': 'apporteurs',
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

    // Add FAQ items
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
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));
    }

    const result: DocSearchResult = {
      type: 'doc',
      results: docResults,
    };

    return withCors(req, new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

  } catch (error) {
    console.error('[unified-search] Error:', error);
    return withCors(req, new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    }));
  }
});
