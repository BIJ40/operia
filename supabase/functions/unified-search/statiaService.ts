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
  hasData?: boolean; // true si des données existent, false si aucune donnée
  dataCount?: number; // nombre de lignes/factures trouvées
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
 * Renvoie hasData=false si aucune facture trouvée
 */
function computeCaGlobalHt(data: ApogeeData, params: StatParams): StatResult {
  const facturesCount = data.factures.length;
  
  // Aucune facture → hasData = false
  if (facturesCount === 0) {
    return { 
      value: 0, 
      unit: '€', 
      hasData: false, 
      dataCount: 0 
    };
  }
  
  let total = 0;
  for (const f of data.factures) {
    const isAvoir = (f.typeFacture || '').toLowerCase() === 'avoir';
    const montant = f.data?.totalHT ?? f.totalHT ?? f.montant ?? 0;
    total += isAvoir ? -Math.abs(montant) : montant;
  }
  
  return { 
    value: Math.round(total), 
    unit: '€', 
    hasData: true, 
    dataCount: facturesCount 
  };
}

/**
 * Compute CA par apporteur (avec support filtre apporteurId)
 * - Mode filtré (apporteurId présent): renvoie une valeur unique pour cet apporteur SANS ranking
 * - Mode global (pas de filtre): renvoie un ranking complet
 */
function computeCaParApporteur(data: ApogeeData, params: StatParams): StatResult {
  console.log(`[computeCaParApporteur] START - ${data.factures.length} factures, ${data.projects.length} projects, ${data.clients.length} clients`);
  
  // Index projects par id (string ET number pour compatibilité)
  const projectsById = new Map<string | number, any>();
  for (const p of data.projects) {
    projectsById.set(p.id, p);
    projectsById.set(String(p.id), p);
    if (typeof p.id === 'number') {
      projectsById.set(String(p.id), p);
    }
  }
  console.log(`[computeCaParApporteur] projectsById size: ${projectsById.size}`);
  
  // Sample des premiers IDs de projets pour debug
  const sampleProjectIds = data.projects.slice(0, 5).map(p => p.id);
  console.log(`[computeCaParApporteur] Sample project IDs: ${JSON.stringify(sampleProjectIds)}`);
  
  // Sample des premiers projectIds des factures pour debug
  const sampleFactureProjectIds = data.factures.slice(0, 5).map(f => ({
    projectId: f.projectId,
    dataProjectId: f.data?.projectId,
    project_id: f.project_id
  }));
  console.log(`[computeCaParApporteur] Sample facture projectIds: ${JSON.stringify(sampleFactureProjectIds)}`);
  
  const apporteurNames = buildApporteurNameMap(data.clients);
  const caByApporteur: Record<string, { name: string; ca: number }> = {};
  
  const filterApporteurId = params.filters?.apporteurId;
  const filterApporteurName = params.filters?.apporteurName;
  
  // Debug stats
  let matchedProjects = 0;
  let unmatchedProjects = 0;
  let matchedWithApporteur = 0;
  let matchedWithFilteredApporteur = 0;
  
  console.log(`[computeCaParApporteur] Filter: apporteurId=${filterApporteurId}, apporteurName=${filterApporteurName}`);
  
  // DEBUG: log première facture pour voir la structure
  if (data.factures.length > 0) {
    const sample = data.factures[0];
    console.log(`[computeCaParApporteur] Sample facture structure: totalHT=${sample.totalHT}, data.totalHT=${sample.data?.totalHT}, montantHT=${sample.montantHT}, data keys=${sample.data ? Object.keys(sample.data).slice(0,10).join(',') : 'no data'}`);
  }
  
  let sumCA = 0;
  
  for (const f of data.factures) {
    const isAvoir = (f.typeFacture || f.type || '').toLowerCase() === 'avoir';
    // Ordre de priorité conforme à extractFactureMeta: data.totalHT > totalHT > montantHT
    const montant = f.data?.totalHT ?? f.totalHT ?? f.montantHT ?? f.montant ?? 0;
    const netMontant = isAvoir ? -Math.abs(montant) : montant;
    
    // Trouver le projet via projectId ou data.projectId
    const projectId = f.projectId ?? f.data?.projectId ?? f.project_id;
    const project = projectId ? (projectsById.get(projectId) || projectsById.get(String(projectId)) || projectsById.get(Number(projectId))) : null;
    
    if (!project) {
      unmatchedProjects++;
      // Log le premier unmatched pour debug
      if (unmatchedProjects === 1) {
        console.log(`[computeCaParApporteur] First unmatched facture: projectId=${projectId}, type=${typeof projectId}`);
      }
      continue;
    }
    matchedProjects++;
    
    const commanditaireId = project?.data?.commanditaireId ?? project?.commanditaireId;
    
    if (commanditaireId) {
      matchedWithApporteur++;
    }
    
    // Si un filtre apporteurId est appliqué, ne garder que cet apporteur
    if (filterApporteurId && String(commanditaireId) !== String(filterApporteurId)) {
      continue;
    }
    
    if (filterApporteurId) {
      matchedWithFilteredApporteur++;
    }
    
    const key = commanditaireId ? String(commanditaireId) : '0';
    const name = commanditaireId 
      ? (apporteurNames.get(String(commanditaireId)) || `Apporteur #${commanditaireId}`)
      : 'Direct';
    
    if (!caByApporteur[key]) caByApporteur[key] = { name, ca: 0 };
    caByApporteur[key].ca += netMontant;
    sumCA += netMontant;
    
    // Log 3 premières factures de l'apporteur filtré
    if (filterApporteurId && matchedWithFilteredApporteur <= 3) {
      console.log(`[computeCaParApporteur] Sample filtered facture #${matchedWithFilteredApporteur}: montant=${montant}, netMontant=${netMontant}, isAvoir=${isAvoir}`);
    }
  }
  
  console.log(`[computeCaParApporteur] Total sumCA=${sumCA}`);
  
  console.log(`[computeCaParApporteur] Project matching: ${matchedProjects} matched, ${unmatchedProjects} unmatched`);
  console.log(`[computeCaParApporteur] Apporteur stats: ${matchedWithApporteur} with apporteur, ${matchedWithFilteredApporteur} with filtered apporteur`);
  
  const sorted = Object.entries(caByApporteur)
    .map(([id, d]) => ({ id, name: d.name, value: Math.round(d.ca) }))
    .filter(x => x.value > 0)
    .sort((a, b) => b.value - a.value);
  
  console.log(`[computeCaParApporteur] ${Object.keys(caByApporteur).length} apporteurs, top 3: ${sorted.slice(0,3).map(s => `${s.name}=${s.value}€`).join(', ')}`);
  
  // ════════════════════════════════════════════════════════════
  // MODE FILTRÉ: un seul apporteur demandé → renvoyer valeur unique SANS ranking
  // ════════════════════════════════════════════════════════════
  if (filterApporteurId) {
    const apporteurData = sorted.find(a => String(a.id) === String(filterApporteurId));
    const apporteurDisplayName = filterApporteurName || apporteurData?.name || `Apporteur #${filterApporteurId}`;
    
    if (apporteurData && apporteurData.value > 0) {
      // Apporteur trouvé avec CA > 0 → valeur unique
      console.log(`[computeCaParApporteur] Found: ${apporteurDisplayName} = ${apporteurData.value}€`);
      return {
        value: apporteurData.value,
        topItem: { rank: 1, id: apporteurData.id, name: apporteurData.name, value: apporteurData.value },
        ranking: undefined, // PAS de ranking pour mode filtré
        unit: '€',
      };
    }
    
    // Apporteur non trouvé ou CA = 0 → valeur 0 avec nom
    console.log(`[computeCaParApporteur] Not found or zero: ${apporteurDisplayName}`);
    return {
      value: 0,
      topItem: { rank: 1, id: String(filterApporteurId), name: String(apporteurDisplayName), value: 0 },
      ranking: undefined, // PAS de ranking pour mode filtré
      unit: '€',
    };
  }
  
  // ════════════════════════════════════════════════════════════
  // MODE GLOBAL: classement complet des apporteurs
  // ════════════════════════════════════════════════════════════
  const topN = params.topN || 10;
  const ranking = sorted.slice(0, topN).map((item, idx) => ({ rank: idx + 1, ...item }));
  const total = sorted.reduce((sum, item) => sum + item.value, 0);
  
  console.log(`[computeCaParApporteur] Ranking mode: ${ranking.length} apporteurs, total=${total}€`);
  
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
 * Compute CA par technicien (avec support filtre technicienId)
 * - Mode filtré (technicienId présent): renvoie une valeur unique sans ranking
 * - Mode global (pas de filtre): renvoie un ranking complet
 */
function computeCaParTechnicien(data: ApogeeData, params: StatParams): StatResult {
  const caByTech: Record<string, { name: string; ca: number }> = {};
  const filterTechnicienId = params.filters?.technicienId;
  const filterTechnicienName = params.filters?.technicienName;
  
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
      
      // Si un filtre technicienId est appliqué, ne garder que ce technicien
      if (filterTechnicienId && String(filterTechnicienId) !== id) {
        continue;
      }
      
      if (!caByTech[id]) caByTech[id] = { name, ca: 0 };
      caByTech[id].ca += share;
    }
  }
  
  const sorted = Object.entries(caByTech)
    .map(([id, d]) => ({ id, name: d.name, value: Math.round(d.ca) }))
    .filter(x => x.value > 0)
    .sort((a, b) => b.value - a.value);
  
  // ════════════════════════════════════════════════════════════
  // MODE FILTRÉ: un seul technicien demandé → renvoyer valeur unique SANS ranking
  // ════════════════════════════════════════════════════════════
  if (filterTechnicienId) {
    const techData = sorted.find(t => String(t.id) === String(filterTechnicienId));
    const techName = filterTechnicienName || techData?.name || `Technicien #${filterTechnicienId}`;
    
    if (techData && techData.value > 0) {
      // Technicien trouvé avec CA > 0 → valeur unique
      return {
        value: techData.value,
        topItem: { rank: 1, id: techData.id, name: techData.name, value: techData.value },
        ranking: undefined, // PAS de ranking pour mode filtré
        unit: '€',
      };
    }
    
    // Technicien non trouvé ou CA = 0 → valeur 0 avec nom
    return {
      value: 0,
      topItem: { rank: 1, id: String(filterTechnicienId), name: String(techName), value: 0 },
      ranking: undefined, // PAS de ranking pour mode filtré
      unit: '€',
    };
  }
  
  // ════════════════════════════════════════════════════════════
  // MODE GLOBAL: classement complet des techniciens
  // ════════════════════════════════════════════════════════════
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

/**
 * Compute nb dossiers par univers
 */
function computeNbDossiersParUnivers(data: ApogeeData, params: StatParams): StatResult {
  const countByUnivers: Record<string, number> = {};
  
  for (const p of data.projects) {
    const universes = extractProjectUniverses(p);
    for (const uni of universes) {
      if (!countByUnivers[uni]) countByUnivers[uni] = 0;
      countByUnivers[uni]++;
    }
  }
  
  const sorted = Object.entries(countByUnivers)
    .map(([name, count]) => ({ id: name, name, value: count }))
    .sort((a, b) => b.value - a.value);
  
  const topN = params.topN || 10;
  const ranking = sorted.slice(0, topN).map((item, idx) => ({ rank: idx + 1, ...item }));
  const total = sorted.reduce((sum, item) => sum + item.value, 0);
  
  return { value: total, topItem: ranking[0], ranking, unit: 'dossiers' };
}

/**
 * Compute nb dossiers par apporteur
 */
function computeNbDossiersParApporteur(data: ApogeeData, params: StatParams): StatResult {
  const apporteurNames = buildApporteurNameMap(data.clients);
  const countByApporteur: Record<string, { name: string; count: number }> = {};
  
  for (const p of data.projects) {
    const commanditaireId = p.data?.commanditaireId;
    const key = commanditaireId ? String(commanditaireId) : '0';
    const name = commanditaireId 
      ? (apporteurNames.get(String(commanditaireId)) || `Apporteur #${commanditaireId}`)
      : 'Direct';
    
    if (!countByApporteur[key]) countByApporteur[key] = { name, count: 0 };
    countByApporteur[key].count++;
  }
  
  const sorted = Object.entries(countByApporteur)
    .map(([id, d]) => ({ id, name: d.name, value: d.count }))
    .sort((a, b) => b.value - a.value);
  
  const topN = params.topN || 10;
  const ranking = sorted.slice(0, topN).map((item, idx) => ({ rank: idx + 1, ...item }));
  const total = sorted.reduce((sum, item) => sum + item.value, 0);
  
  return { value: total, topItem: ranking[0], ranking, unit: 'dossiers' };
}

/**
 * Compute taux de transformation devis → facture
 */
function computeTauxTransformationDevis(data: ApogeeData, _params: StatParams): StatResult {
  const devis = (data as any).devis || [];
  if (devis.length === 0) return { value: 0, unit: '%' };
  
  // Count devis avec facture associée
  const facturedProjectIds = new Set(data.factures.map(f => f.projectId));
  let devisTransformes = 0;
  
  for (const d of devis) {
    if (facturedProjectIds.has(d.projectId)) {
      devisTransformes++;
    }
  }
  
  const taux = (devisTransformes / devis.length) * 100;
  return { value: Math.round(taux * 10) / 10, unit: '%' };
}

/**
 * Compute délai moyen premier devis (jours)
 */
function computeDelaiPremierDevis(data: ApogeeData, _params: StatParams): StatResult {
  const delays: number[] = [];
  
  for (const p of data.projects) {
    const createdAt = p.created_at || p.date;
    const history = p.data?.history || p.history || [];
    
    // Find first "Devis envoyé" event
    const devisEvent = history.find((h: any) => 
      h.kind === 2 && (h.labelKind || '').includes('Devis envoyé')
    );
    
    if (createdAt && devisEvent?.dateModif) {
      try {
        const start = new Date(createdAt);
        // Parse French date format dd/MM/yyyy HH:mm:ss
        const parts = devisEvent.dateModif.split(' ')[0].split('/');
        if (parts.length === 3) {
          const end = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays > 0 && diffDays <= 60) {
            delays.push(diffDays);
          }
        }
      } catch (e) { /* ignore */ }
    }
  }
  
  if (delays.length === 0) return { value: 0, unit: 'jours' };
  
  const avg = delays.reduce((a, b) => a + b, 0) / delays.length;
  return { value: Math.round(avg * 10) / 10, unit: 'jours' };
}

/**
 * Compute délai moyen facture (jours depuis création dossier)
 */
function computeDelaiMoyenFacture(data: ApogeeData, _params: StatParams): StatResult {
  const projectsById = new Map(data.projects.map(p => [p.id, p]));
  const delays: number[] = [];
  
  for (const f of data.factures) {
    const project = projectsById.get(f.projectId);
    if (!project) continue;
    
    const createdAt = project.created_at || project.date;
    const factureDate = f.dateReelle || f.date || f.created_at;
    
    if (createdAt && factureDate) {
      try {
        const start = new Date(createdAt);
        const end = new Date(factureDate);
        const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays > 0 && diffDays <= 365) {
          delays.push(diffDays);
        }
      } catch (e) { /* ignore */ }
    }
  }
  
  if (delays.length === 0) return { value: 0, unit: 'jours' };
  
  const avg = delays.reduce((a, b) => a + b, 0) / delays.length;
  return { value: Math.round(avg * 10) / 10, unit: 'jours' };
}

/**
 * Compute CA moyen par jour
 */
function computeCaMoyenParJour(data: ApogeeData, params: StatParams): StatResult {
  const caResult = computeCaGlobalHt(data, params);
  const start = params.dateRange.start;
  const end = params.dateRange.end;
  
  const diffDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const moyenne = caResult.value / diffDays;
  
  return { value: Math.round(moyenne), unit: '€/jour' };
}

/**
 * Compute top techniciens par CA
 */
function computeTopTechniciensCA(data: ApogeeData, params: StatParams): StatResult {
  return computeCaParTechnicien(data, params);
}

/**
 * Compute SAV par univers
 */
function computeSavParUnivers(data: ApogeeData, params: StatParams): StatResult {
  const countByUnivers: Record<string, { total: number; sav: number }> = {};
  
  for (const p of data.projects) {
    const universes = extractProjectUniverses(p);
    const type2 = (p.data?.type2 || '').toLowerCase();
    const pictos = (p.data?.pictosInterv || []).map((pic: string) => pic.toLowerCase());
    const isSav = type2 === 'sav' || pictos.some((pic: string) => pic === 'sav');
    
    for (const uni of universes) {
      if (!countByUnivers[uni]) countByUnivers[uni] = { total: 0, sav: 0 };
      countByUnivers[uni].total++;
      if (isSav) countByUnivers[uni].sav++;
    }
  }
  
  const sorted = Object.entries(countByUnivers)
    .map(([name, d]) => ({
      id: name,
      name,
      value: d.total > 0 ? Math.round((d.sav / d.total) * 10000) / 100 : 0,
    }))
    .filter(x => x.value > 0)
    .sort((a, b) => b.value - a.value);
  
  const topN = params.topN || 10;
  const ranking = sorted.slice(0, topN).map((item, idx) => ({ rank: idx + 1, ...item }));
  
  return { value: 0, topItem: ranking[0], ranking, unit: '%' };
}

/**
 * Compute SAV par apporteur
 */
function computeSavParApporteur(data: ApogeeData, params: StatParams): StatResult {
  const apporteurNames = buildApporteurNameMap(data.clients);
  const countByApporteur: Record<string, { name: string; total: number; sav: number }> = {};
  
  for (const p of data.projects) {
    const commanditaireId = p.data?.commanditaireId;
    const key = commanditaireId ? String(commanditaireId) : '0';
    const name = commanditaireId 
      ? (apporteurNames.get(String(commanditaireId)) || `Apporteur #${commanditaireId}`)
      : 'Direct';
    
    const type2 = (p.data?.type2 || '').toLowerCase();
    const pictos = (p.data?.pictosInterv || []).map((pic: string) => pic.toLowerCase());
    const isSav = type2 === 'sav' || pictos.some((pic: string) => pic === 'sav');
    
    if (!countByApporteur[key]) countByApporteur[key] = { name, total: 0, sav: 0 };
    countByApporteur[key].total++;
    if (isSav) countByApporteur[key].sav++;
  }
  
  const sorted = Object.entries(countByApporteur)
    .map(([id, d]) => ({
      id,
      name: d.name,
      value: d.total > 0 ? Math.round((d.sav / d.total) * 10000) / 100 : 0,
    }))
    .filter(x => x.value > 0)
    .sort((a, b) => b.value - a.value);
  
  const topN = params.topN || 10;
  const ranking = sorted.slice(0, topN).map((item, idx) => ({ rank: idx + 1, ...item }));
  
  return { value: 0, topItem: ranking[0], ranking, unit: '%' };
}

/**
 * Compute taux de recouvrement
 */
function computeTauxRecouvrement(data: ApogeeData, _params: StatParams): StatResult {
  let totalFacture = 0;
  let totalEncaisse = 0;
  
  for (const f of data.factures) {
    const isAvoir = (f.typeFacture || '').toLowerCase() === 'avoir';
    if (isAvoir) continue;
    
    const montant = f.data?.totalTTC ?? f.totalTTC ?? 0;
    const reste = f.data?.calcReglementsReste ?? f.restePaidTTC ?? 0;
    
    totalFacture += montant;
    totalEncaisse += (montant - reste);
  }
  
  const taux = totalFacture > 0 ? (totalEncaisse / totalFacture) * 100 : 0;
  return { value: Math.round(taux * 10) / 10, unit: '%' };
}

/**
 * Compute reste à encaisser
 */
function computeResteAEncaisser(data: ApogeeData, _params: StatParams): StatResult {
  let totalReste = 0;
  
  for (const f of data.factures) {
    const isAvoir = (f.typeFacture || '').toLowerCase() === 'avoir';
    if (isAvoir) continue;
    
    const reste = f.data?.calcReglementsReste ?? f.restePaidTTC ?? 0;
    totalReste += reste;
  }
  
  return { value: Math.round(totalReste), unit: '€' };
}

/**
 * Compute CA mensuel (groupé par mois)
 */
function computeCaMensuel(data: ApogeeData, _params: StatParams): StatResult {
  const caByMonth: Record<string, number> = {};
  
  for (const f of data.factures) {
    const isAvoir = (f.typeFacture || '').toLowerCase() === 'avoir';
    const montant = f.data?.totalHT ?? f.totalHT ?? f.montant ?? 0;
    const netMontant = isAvoir ? -Math.abs(montant) : montant;
    
    const factureDate = f.dateReelle || f.date;
    if (!factureDate) continue;
    
    const d = new Date(factureDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    
    if (!caByMonth[key]) caByMonth[key] = 0;
    caByMonth[key] += netMontant;
  }
  
  const sorted = Object.entries(caByMonth)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([id, ca], idx) => ({ rank: idx + 1, id, name: id, value: Math.round(ca) }));
  
  const total = sorted.reduce((sum, item) => sum + item.value, 0);
  
  return { value: total, ranking: sorted, unit: '€' };
}

// ============= METRIC REGISTRY =============
const METRIC_COMPUTERS: Record<string, (data: ApogeeData, params: StatParams) => StatResult> = {
  'ca_global_ht': computeCaGlobalHt,
  'ca_par_apporteur': computeCaParApporteur,
  'ca_par_univers': computeCaParUnivers,
  'ca_par_technicien': computeCaParTechnicien,
  'top_techniciens_ca': computeTopTechniciensCA,
  'top_apporteurs_ca': computeCaParApporteur, // Alias pour top apporteurs
  'taux_sav_global': computeTauxSav,
  'sav_par_univers': computeSavParUnivers,
  'sav_par_apporteur': computeSavParApporteur,
  'panier_moyen': computePanierMoyen,
  'nb_dossiers_crees': computeNbDossiers,
  'ca_moyen_par_tech': computeCaMoyenParTech,
  'nb_dossiers_par_univers': computeNbDossiersParUnivers,
  'dossiers_par_apporteur': computeNbDossiersParApporteur,
  'taux_transformation_devis': computeTauxTransformationDevis,
  'delai_premier_devis': computeDelaiPremierDevis,
  'delai_moyen_facture': computeDelaiMoyenFacture,
  'ca_moyen_par_jour': computeCaMoyenParJour,
  'taux_recouvrement': computeTauxRecouvrement,
  'reste_a_encaisser': computeResteAEncaisser,
  'ca_mensuel': computeCaMensuel,
};

// ============= CACHE =============
const CACHE = new Map<string, { result: StatResult; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCacheKey(metricId: string, params: StatParams): string {
  return `${metricId}:${params.agencySlug}:${params.dateRange.start.toISOString()}:${params.dateRange.end.toISOString()}:${params.topN || 10}`;
}

function getFromCache(key: string): StatResult | null {
  const entry = CACHE.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    CACHE.delete(key);
    return null;
  }
  return { ...entry.result, fromCache: true };
}

function setInCache(key: string, result: StatResult): void {
  CACHE.set(key, { result, timestamp: Date.now() });
}

// ============= MAIN COMPUTE FUNCTION =============

/**
 * Compute a StatIA metric with caching
 */
export function computeMetric(
  metricId: string,
  data: ApogeeData,
  params: StatParams,
  useCache = true
): StatResult {
  const cacheKey = getCacheKey(metricId, params);
  
  if (useCache) {
    const cached = getFromCache(cacheKey);
    if (cached) return cached;
  }
  
  const computer = METRIC_COMPUTERS[metricId];
  
  if (!computer) {
    console.warn(`[statiaService] Unknown metric: ${metricId}, falling back to ca_global_ht`);
    return computeCaGlobalHt(data, params);
  }
  
  const result = computer(data, params);
  
  if (useCache) {
    setInCache(cacheKey, result);
  }
  
  return result;
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
    'top_techniciens_ca': ['factures'],
    'taux_sav_global': ['projects'],
    'sav_par_univers': ['projects'],
    'sav_par_apporteur': ['projects', 'clients'],
    'panier_moyen': ['factures'],
    'nb_dossiers_crees': ['projects'],
    'ca_moyen_par_tech': ['factures'],
    'nb_dossiers_par_univers': ['projects'],
    'dossiers_par_apporteur': ['projects', 'clients'],
    'taux_transformation_devis': ['devis', 'factures'],
    'delai_premier_devis': ['projects'],
    'delai_moyen_facture': ['factures', 'projects'],
    'ca_moyen_par_jour': ['factures'],
    'taux_recouvrement': ['factures'],
    'reste_a_encaisser': ['factures'],
    'ca_mensuel': ['factures'],
  };
  
  return sourceMap[metricId] || ['factures'];
}
