/**
 * StatIA Service for Edge Functions
 * Provides StatIA metric computation within edge function context
 */

// ============= TYPES =============
export interface StatParams {
  dateRange: { start: Date; end: Date };
  agencySlug: string;
  topN?: number;
  filters?: Record<string, unknown>;
}

export interface RankingItem {
  rank: number;
  id: string | number;
  name: string;
  value: number;
  color?: string;
}

export interface StatResult {
  value: number;
  topItem?: RankingItem;
  ranking?: RankingItem[];
  unit: string;
  fromCache?: boolean;
}

// ============= APPORTEUR NAME MAPPING =============
function buildApporteurNameMap(clients: any[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const c of clients) {
    const id = String(c.id);
    const nom = 
      c.displayName ||
      c.raisonSociale ||
      c.nom ||
      c.name ||
      c.label ||
      c.data?.nom ||
      c.data?.name ||
      c.data?.raisonSociale ||
      `Apporteur ${id}`;
    map.set(id, nom);
  }
  return map;
}

// ============= UNIVERS NORMALIZATION =============
const UNIVERS_BLACKLIST = ['CHAUFFAGE', 'CLIMATISATION'];

function normalizeUnivers(raw: string): string {
  const normalized = (raw || 'Non catégorisé')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9\s]/g, '')
    .trim();
  
  if (UNIVERS_BLACKLIST.includes(normalized)) return '';
  if (!normalized || normalized === 'NON CATEGORISE') return 'Non catégorisé';
  return normalized.charAt(0) + normalized.slice(1).toLowerCase();
}

function extractProjectUniverses(project: any): string[] {
  const universes = project?.data?.universes || project?.universes || [];
  if (!Array.isArray(universes) || universes.length === 0) return ['Non catégorisé'];
  
  const filtered = universes
    .map((u: string) => normalizeUnivers(u))
    .filter((u: string) => u && u !== '');
  
  return filtered.length > 0 ? filtered : ['Non catégorisé'];
}

// ============= METRIC COMPUTERS =============

interface ApogeeData {
  factures: any[];
  projects: any[];
  clients: any[];
  interventions: any[];
  users: any[];
}

/**
 * Compute CA global HT
 */
function computeCaGlobalHt(data: ApogeeData, params: StatParams): StatResult {
  let total = 0;
  for (const f of data.factures) {
    const isAvoir = (f.typeFacture || '').toLowerCase() === 'avoir';
    const montant = f.data?.totalHT ?? f.totalHT ?? f.montant ?? 0;
    total += isAvoir ? -Math.abs(montant) : montant;
  }
  return { value: Math.round(total), unit: '€' };
}

/**
 * Compute CA par apporteur
 */
function computeCaParApporteur(data: ApogeeData, params: StatParams): StatResult {
  const projectsById = new Map(data.projects.map(p => [p.id, p]));
  const apporteurNames = buildApporteurNameMap(data.clients);
  const caByApporteur: Record<string, { name: string; ca: number }> = {};
  
  for (const f of data.factures) {
    const isAvoir = (f.typeFacture || '').toLowerCase() === 'avoir';
    const montant = f.data?.totalHT ?? f.totalHT ?? f.montant ?? 0;
    const netMontant = isAvoir ? -Math.abs(montant) : montant;
    
    const project = projectsById.get(f.projectId);
    const commanditaireId = project?.data?.commanditaireId;
    
    const key = commanditaireId ? String(commanditaireId) : '0';
    const name = commanditaireId 
      ? (apporteurNames.get(String(commanditaireId)) || `Apporteur #${commanditaireId}`)
      : 'Direct';
    
    if (!caByApporteur[key]) caByApporteur[key] = { name, ca: 0 };
    caByApporteur[key].ca += netMontant;
  }
  
  const sorted = Object.entries(caByApporteur)
    .map(([id, d]) => ({ id, name: d.name, value: Math.round(d.ca) }))
    .filter(x => x.value > 0)
    .sort((a, b) => b.value - a.value);
  
  const topN = params.topN || 10;
  const ranking = sorted.slice(0, topN).map((item, idx) => ({ rank: idx + 1, ...item }));
  const total = sorted.reduce((sum, item) => sum + item.value, 0);
  
  return {
    value: total,
    topItem: ranking[0],
    ranking,
    unit: '€',
  };
}

/**
 * Compute CA par univers
 */
function computeCaParUnivers(data: ApogeeData, params: StatParams): StatResult {
  const projectsById = new Map(data.projects.map(p => [p.id, p]));
  const caByUnivers: Record<string, number> = {};
  
  for (const f of data.factures) {
    const isAvoir = (f.typeFacture || '').toLowerCase() === 'avoir';
    const montant = f.data?.totalHT ?? f.totalHT ?? f.montant ?? 0;
    const netMontant = isAvoir ? -Math.abs(montant) : montant;
    
    const project = projectsById.get(f.projectId);
    const universes = extractProjectUniverses(project);
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
  
  const topN = params.topN || 10;
  const ranking = sorted.slice(0, topN).map((item, idx) => ({ rank: idx + 1, ...item }));
  const total = sorted.reduce((sum, item) => sum + item.value, 0);
  
  return {
    value: total,
    topItem: ranking[0],
    ranking,
    unit: '€',
  };
}

/**
 * Compute CA par technicien
 */
function computeCaParTechnicien(data: ApogeeData, params: StatParams): StatResult {
  const caByTech: Record<string, { name: string; ca: number }> = {};
  
  for (const f of data.factures) {
    const isAvoir = (f.typeFacture || '').toLowerCase() === 'avoir';
    const montant = f.data?.totalHT ?? f.totalHT ?? f.montant ?? 0;
    const netMontant = isAvoir ? -Math.abs(montant) : montant;
    
    const techs = f.data?.technicians || [];
    if (techs.length === 0) continue;
    
    const share = netMontant / techs.length;
    for (const tech of techs) {
      const id = String(tech.id);
      const name = `${tech.firstname || ''} ${tech.lastname || ''}`.trim() || `Tech #${tech.id}`;
      
      if (!caByTech[id]) caByTech[id] = { name, ca: 0 };
      caByTech[id].ca += share;
    }
  }
  
  const sorted = Object.entries(caByTech)
    .map(([id, d]) => ({ id, name: d.name, value: Math.round(d.ca) }))
    .filter(x => x.value > 0)
    .sort((a, b) => b.value - a.value);
  
  const topN = params.topN || 10;
  const ranking = sorted.slice(0, topN).map((item, idx) => ({ rank: idx + 1, ...item }));
  const total = sorted.reduce((sum, item) => sum + item.value, 0);
  
  return {
    value: total,
    topItem: ranking[0],
    ranking,
    unit: '€',
  };
}

/**
 * Compute taux SAV global
 */
function computeTauxSav(data: ApogeeData, _params: StatParams): StatResult {
  const totalDossiers = data.projects.length;
  if (totalDossiers === 0) return { value: 0, unit: '%' };
  
  // Count SAV dossiers (type2 === 'sav' or pictos containing 'sav')
  let savCount = 0;
  for (const p of data.projects) {
    const type2 = (p.data?.type2 || '').toLowerCase();
    const pictos = (p.data?.pictosInterv || []).map((pic: string) => pic.toLowerCase());
    
    if (type2 === 'sav' || pictos.some((pic: string) => pic === 'sav')) {
      savCount++;
    }
  }
  
  const taux = (savCount / totalDossiers) * 100;
  return { value: Math.round(taux * 100) / 100, unit: '%' };
}

/**
 * Compute panier moyen
 */
function computePanierMoyen(data: ApogeeData, _params: StatParams): StatResult {
  let totalCA = 0;
  let nbFactures = 0;
  
  for (const f of data.factures) {
    const isAvoir = (f.typeFacture || '').toLowerCase() === 'avoir';
    if (isAvoir) continue;
    
    const montant = f.data?.totalHT ?? f.totalHT ?? f.montant ?? 0;
    if (montant > 0) {
      totalCA += montant;
      nbFactures++;
    }
  }
  
  const panier = nbFactures > 0 ? totalCA / nbFactures : 0;
  return { value: Math.round(panier), unit: '€' };
}

/**
 * Compute nb dossiers créés
 */
function computeNbDossiers(data: ApogeeData, _params: StatParams): StatResult {
  return { value: data.projects.length, unit: '' };
}

/**
 * Compute CA moyen par technicien
 */
function computeCaMoyenParTech(data: ApogeeData, params: StatParams): StatResult {
  const result = computeCaParTechnicien(data, params);
  const nbTechs = result.ranking?.length || 0;
  
  if (nbTechs === 0) return { value: 0, unit: '€' };
  
  const moyenne = result.value / nbTechs;
  return { value: Math.round(moyenne), unit: '€' };
}

// ============= METRIC REGISTRY =============
const METRIC_COMPUTERS: Record<string, (data: ApogeeData, params: StatParams) => StatResult> = {
  'ca_global_ht': computeCaGlobalHt,
  'ca_par_apporteur': computeCaParApporteur,
  'ca_par_univers': computeCaParUnivers,
  'ca_par_technicien': computeCaParTechnicien,
  'taux_sav_global': computeTauxSav,
  'panier_moyen': computePanierMoyen,
  'nb_dossiers_crees': computeNbDossiers,
  'ca_moyen_par_tech': computeCaMoyenParTech,
  // Add aliases
  'nb_dossiers_par_univers': computeCaParUnivers, // TODO: implement proper dossiers par univers
  'dossiers_par_apporteur': computeCaParApporteur, // TODO: implement proper dossiers par apporteur
  'taux_transformation_devis': (data, params) => ({ value: 0, unit: '%' }), // TODO
};

// ============= MAIN COMPUTE FUNCTION =============

/**
 * Compute a StatIA metric
 */
export function computeMetric(
  metricId: string,
  data: ApogeeData,
  params: StatParams
): StatResult {
  const computer = METRIC_COMPUTERS[metricId];
  
  if (!computer) {
    console.warn(`[statiaService] Unknown metric: ${metricId}, falling back to ca_global_ht`);
    return computeCaGlobalHt(data, params);
  }
  
  return computer(data, params);
}

/**
 * Check if metric exists
 */
export function hasMetric(metricId: string): boolean {
  return metricId in METRIC_COMPUTERS;
}

/**
 * Get required data sources for a metric
 */
export function getRequiredSources(metricId: string): string[] {
  const sourceMap: Record<string, string[]> = {
    'ca_global_ht': ['factures'],
    'ca_par_apporteur': ['factures', 'projects', 'clients'],
    'ca_par_univers': ['factures', 'projects'],
    'ca_par_technicien': ['factures'],
    'taux_sav_global': ['projects'],
    'panier_moyen': ['factures'],
    'nb_dossiers_crees': ['projects'],
    'ca_moyen_par_tech': ['factures'],
    'nb_dossiers_par_univers': ['factures', 'projects'],
    'dossiers_par_apporteur': ['factures', 'projects', 'clients'],
    'taux_transformation_devis': ['devis', 'factures'],
  };
  
  return sourceMap[metricId] || ['factures'];
}
