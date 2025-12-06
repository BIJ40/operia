/**
 * StatIA - Moteur partagé CA par Technicien
 * 
 * COPIE EXACTE de la logique frontend (src/statia/definitions/techniciens.ts)
 * pour garantir des chiffres identiques entre frontend et edge function.
 * 
 * RÈGLE MÉTIER:
 * - Pour chaque facture de la période, récupérer le projectId
 * - Identifier les techniciens productifs uniques (set de usersIds des visites productives)
 * - Répartir CA_HT_total / nbTechsProductifs de manière ÉGALE
 * - Avoirs intégrés en négatif
 * - Exclure RT, SAV, diagnostics, visites annulées
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
  hasData?: boolean;
  dataCount?: number;
}

interface ApogeeData {
  factures: any[];
  projects: any[];
  clients: any[];
  interventions: any[];
  users: any[];
}

// ============= HELPERS IDENTIQUES AU FRONTEND =============

/**
 * Vérifie si une intervention est de type RT (Relevé Technique) - NON PRODUCTIF
 */
function isRTIntervention(intervention: any): boolean {
  const type2 = (intervention.type2 || intervention.data?.type2 || '').toLowerCase();
  const type = (intervention.type || intervention.data?.type || '').toLowerCase();
  
  // RT explicite via type2
  if (type2.includes('relevé') || type2.includes('releve') || type2.includes('technique')) return true;
  if (type2 === 'rt') return true;
  
  // RT explicite via type
  if (type.includes('rt')) return true;
  
  // RT via flags bi (biRt seul = RT)
  if (intervention.data?.biRt && !intervention.data?.biDepan && !intervention.data?.biTvx && !intervention.data?.biV3) return true;
  if (intervention.data?.isRT) return true;
  
  return false;
}

/**
 * Vérifie si une intervention est de type SAV - NON PRODUCTIF
 */
function isSAVIntervention(intervention: any): boolean {
  const type2 = (intervention.type2 || intervention.data?.type2 || '').toLowerCase();
  const type = (intervention.type || intervention.data?.type || '').toLowerCase();
  
  return type2.includes('sav') || type.includes('sav');
}

/**
 * Vérifie si une intervention est de type diagnostic - NON PRODUCTIF
 */
function isDiagnosticIntervention(intervention: any): boolean {
  const type2 = (intervention.type2 || intervention.data?.type2 || '').toLowerCase();
  const type = (intervention.type || intervention.data?.type || '').toLowerCase();
  
  return type2.includes('diagnostic') || type.includes('diagnostic');
}

/**
 * Vérifie si une intervention "A DÉFINIR" a du travail productif réalisé
 */
function hasProductiveWorkDone(intervention: any): boolean {
  const hasDepanWork = intervention.data?.biDepan?.isWorkDone || intervention.data?.biDepan?.tvxEffectues;
  const hasTvxWork = intervention.data?.biTvx?.isWorkDone || intervention.data?.biTvx?.tvxEffectues;
  const hasV3Work = intervention.data?.biV3?.items?.length > 0;
  return hasDepanWork || hasTvxWork || hasV3Work;
}

/**
 * Vérifie si une intervention est productive pour le calcul CA technicien
 */
function isProductiveIntervention(intervention: any): boolean {
  // Exclure les RT, SAV, diagnostics
  if (isRTIntervention(intervention)) return false;
  if (isSAVIntervention(intervention)) return false;
  if (isDiagnosticIntervention(intervention)) return false;
  
  const type2 = (intervention.type2 || intervention.data?.type2 || '').toLowerCase();
  
  // Cas "RDV à définir" : inclure seulement si travaux réalisés
  if (type2.includes('définir') || type2.includes('a définir') || type2.includes('à définir')) {
    return hasProductiveWorkDone(intervention);
  }
  
  // Par défaut : inclure (dépannages, travaux, etc.)
  return true;
}

/**
 * Récupère les techniciens productifs d'une intervention
 * Collecte de toutes les sources possibles
 */
function getProductiveTechnicians(intervention: any): Set<string | number> {
  const techIds = new Set<string | number>();
  
  // 1. Collecter depuis userId principal
  if (intervention.userId) {
    techIds.add(intervention.userId);
  }
  
  // 2. Collecter depuis usersIds au niveau intervention
  if (intervention.usersIds && Array.isArray(intervention.usersIds)) {
    intervention.usersIds.forEach((id: any) => {
      if (id) techIds.add(id);
    });
  }
  
  // 3. Collecter depuis data.visites (toutes les visites)
  const visites = intervention.visites || intervention.data?.visites || [];
  for (const visite of visites) {
    const userIds = visite.usersIds || visite.userIds || [];
    for (const techId of userIds) {
      if (techId) techIds.add(techId);
    }
  }
  
  // 4. Collecter depuis biV3.items (structure spécifique Apogée)
  if (intervention.data?.biV3?.items && Array.isArray(intervention.data.biV3.items)) {
    for (const item of intervention.data.biV3.items) {
      if (item.usersIds && Array.isArray(item.usersIds)) {
        item.usersIds.forEach((id: any) => {
          if (id) techIds.add(id);
        });
      }
    }
  }
  
  return techIds;
}

/**
 * Vérifie si l'état de la facture est inclus dans le CA
 */
function isFactureStateIncluded(state: string): boolean {
  const normalizedState = (state || '').toLowerCase().trim();
  
  // États toujours inclus
  const includedStates = [
    'sent', 'paid', 'partial', 'partially_paid', 'overdue',
    'envoyé', 'payé', 'partiellement_payé', 'en_retard', 'impayé',
    'facturé', 'facture', 'invoice_sent'
  ];
  
  if (includedStates.includes(normalizedState)) return true;
  
  // États exclus explicitement
  const excludedStates = ['cancelled', 'annulé', 'annule', 'draft', 'brouillon'];
  if (excludedStates.includes(normalizedState)) return false;
  
  // Par défaut, inclure si non vide
  return normalizedState.length > 0;
}

/**
 * Extrait les métadonnées d'une facture (date, montant net HT)
 */
function extractFactureMeta(facture: any): { date: Date | null; montantNetHT: number } {
  // Date: priorité dateReelle > date
  const rawDate = facture.dateReelle || facture.date || facture.data?.dateReelle || facture.data?.date;
  const date = rawDate ? new Date(rawDate) : null;
  
  // Montant HT
  const rawMontant = facture.data?.totalHT ?? facture.totalHT ?? facture.montantHT ?? facture.montant ?? 0;
  const montant = typeof rawMontant === 'string' ? parseFloat(rawMontant) || 0 : rawMontant;
  
  // Avoir = négatif
  const typeFacture = (facture.typeFacture || facture.type || facture.data?.type || '').toLowerCase();
  const isAvoir = typeFacture === 'avoir';
  const montantNetHT = isAvoir ? -Math.abs(montant) : montant;
  
  return { date, montantNetHT };
}

// ============= MOTEUR PRINCIPAL =============

/**
 * Compute CA par technicien - LOGIQUE EXACTE DU FRONTEND
 * 
 * @param data Données Apogée chargées
 * @param params Paramètres (dateRange, topN, filters)
 * @returns StatResult avec ranking des techniciens
 */
export function computeCaParTechnicienShared(data: ApogeeData, params: StatParams): StatResult {
  const factures = data.factures || [];
  const projects = data.projects || [];
  const interventions = data.interventions || [];
  const users = data.users || [];
  
  console.log(`[EDGE StatIA ca_par_technicien] Données: ${factures.length} factures, ${projects.length} projets, ${interventions.length} interventions, ${users.length} users`);
  
  // Index projects par id
  const projectsById = new Map<string | number, any>();
  for (const p of projects) {
    projectsById.set(p.id, p);
    projectsById.set(String(p.id), p);
    if (typeof p.id === 'number') {
      projectsById.set(String(p.id), p);
    }
  }
  
  // Index users par id
  const usersById = new Map<string | number, any>();
  for (const u of users) {
    usersById.set(u.id, u);
    usersById.set(String(u.id), u);
    if (typeof u.id === 'number') {
      usersById.set(String(u.id), u);
    }
  }
  
  // Index interventions par projectId
  const interventionsByProject = new Map<string, any[]>();
  for (const intervention of interventions) {
    const projectId = String(intervention.projectId || intervention.project_id);
    if (!projectId) continue;
    if (!interventionsByProject.has(projectId)) {
      interventionsByProject.set(projectId, []);
    }
    interventionsByProject.get(projectId)!.push(intervention);
  }
  
  // Structure pour accumuler CA par technicien
  const techCA = new Map<string, number>();
  const techInfo = new Map<string, { name: string; color: string }>();
  
  // Helper pour récupérer info user
  const getUserInfo = (techId: string | number) => {
    let user = usersById.get(techId);
    if (!user) user = usersById.get(Number(techId));
    if (!user) user = usersById.get(String(techId));
    
    if (user) {
      const prenom = (user.firstname || '').trim();
      const nom = (user.name || user.lastname || '').trim();
      const fullName = [prenom, nom].filter(Boolean).join(' ') || `Tech ${techId}`;
      const color = user.data?.bgcolor?.hex || user.bgcolor?.hex || user.data?.color?.hex || user.color?.hex || '#808080';
      return { name: fullName, color };
    }
    return { name: `Tech ${techId}`, color: '#808080' };
  };
  
  let totalCADistribue = 0;
  let facturesTraitees = 0;
  let dossiersIgnores = 0;
  
  const filterTechnicienId = params.filters?.technicienId;
  
  // Parcourir les factures
  for (const facture of factures) {
    const meta = extractFactureMeta(facture);
    
    // Filtrer par période
    if (!meta.date || meta.date < params.dateRange.start || meta.date > params.dateRange.end) continue;
    
    // Exclure proforma
    const typeFacture = (facture.typeFacture || facture.type || facture.data?.type || '').toLowerCase();
    if (typeFacture === 'proforma' || typeFacture === 'pro_forma') continue;
    
    // Vérifier état facture
    const factureState = facture.state || facture.status || facture.statut 
      || facture.data?.state || facture.data?.status || facture.paymentStatus || '';
    if (!isFactureStateIncluded(factureState)) continue;
    
    const projectId = String(facture.projectId || facture.project_id);
    if (!projectId) continue;
    
    // Récupérer les interventions du projet
    const projectInterventions = interventionsByProject.get(projectId) || [];
    
    // Construire le SET des techniciens productifs uniques
    const techsProductifs = new Set<string | number>();
    
    for (const intervention of projectInterventions) {
      // Filtrer les interventions non-productives (RT, SAV, diagnostic)
      if (!isProductiveIntervention(intervention)) continue;
      
      // Collecter les techniciens de cette intervention
      const interventionTechs = getProductiveTechnicians(intervention);
      for (const techId of interventionTechs) {
        techsProductifs.add(techId);
      }
    }
    
    // Si aucun technicien productif identifié, ignorer ce dossier
    if (techsProductifs.size === 0) {
      dossiersIgnores++;
      continue;
    }
    
    // Quote-part égale pour chaque technicien
    const quotePart = meta.montantNetHT / techsProductifs.size;
    
    // Attribuer à chaque technicien du set
    for (const techId of techsProductifs) {
      const id = String(techId);
      techCA.set(id, (techCA.get(id) || 0) + quotePart);
      
      if (!techInfo.has(id)) {
        techInfo.set(id, getUserInfo(techId));
      }
    }
    
    totalCADistribue += meta.montantNetHT;
    facturesTraitees++;
  }
  
  console.log(`[EDGE StatIA ca_par_technicien] Résultat: ${facturesTraitees} factures traitées, ${techCA.size} techniciens, ${dossiersIgnores} dossiers ignorés, CA total ${Math.round(totalCADistribue)}€`);
  
  // Construire le ranking
  const sorted = Array.from(techCA.entries())
    .map(([id, ca]) => {
      const info = techInfo.get(id) || { name: `Tech ${id}`, color: '#808080' };
      return { id, name: info.name, value: Math.round(ca), color: info.color };
    })
    .filter(x => x.value !== 0)
    .sort((a, b) => b.value - a.value);
  
  console.log(`[EDGE StatIA ca_par_technicien] Top 3: ${sorted.slice(0, 3).map(t => `${t.name}=${t.value}€`).join(', ')}`);
  
  // MODE FILTRÉ: un seul technicien demandé
  if (filterTechnicienId) {
    const techData = sorted.find(t => String(t.id) === String(filterTechnicienId));
    
    if (techData && techData.value !== 0) {
      return {
        value: techData.value,
        topItem: { rank: 1, id: techData.id, name: techData.name, value: techData.value, color: techData.color },
        unit: '€',
        hasData: true,
        dataCount: facturesTraitees,
      };
    }
    
    const techName = params.filters?.technicienName || `Tech #${filterTechnicienId}`;
    return {
      value: 0,
      topItem: { rank: 1, id: String(filterTechnicienId), name: String(techName), value: 0 },
      unit: '€',
      hasData: true,
      dataCount: facturesTraitees,
    };
  }
  
  // MODE GLOBAL: classement complet
  const topN = params.topN || 10;
  const ranking = sorted.slice(0, topN).map((item, idx) => ({ 
    rank: idx + 1, 
    id: item.id, 
    name: item.name, 
    value: item.value,
    color: item.color,
  }));
  const total = sorted.reduce((sum, item) => sum + item.value, 0);
  
  return {
    value: total,
    topItem: ranking[0],
    ranking,
    unit: '€',
    hasData: facturesTraitees > 0,
    dataCount: facturesTraitees,
  };
}
