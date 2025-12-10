/**
 * Moteur de calcul de la charge de travail TRAVAUX à venir
 * Basé sur les RT (Relevé Technique) par univers
 */

// États workflow éligibles pour le calcul
const ETATS_ELIGIBLES = [
  'À planifier TVX',
  'À commander', 
  'En attente fournitures'
];

export interface ChargeTravauxProjet {
  projectId: number | string;
  reference?: string;
  label?: string;
  etatWorkflow: 'À planifier TVX' | 'À commander' | 'En attente fournitures' | string;
  universes: string[];
  totalHeuresRdv: number;
  totalHeuresTech: number;
}

export interface ChargeTravauxUniversStats {
  univers: string;
  nbDossiers: number;
  totalHeuresRdv: number;
  totalHeuresTech: number;
  totalHeuresTech_A_planifier_TVX: number;
  totalHeuresTech_A_commander: number;
  totalHeuresTech_En_attente_fournitures: number;
}

export interface ChargeTravauxResult {
  parUnivers: ChargeTravauxUniversStats[];
  parProjet: ChargeTravauxProjet[];
  totaux: {
    totalHeuresRdv: number;
    totalHeuresTech: number;
    nbDossiers: number;
  };
  debug: {
    totalProjects: number;
    projectsEligibleState: number;
    projectsAvecRT: number;
    rtBlocksCount: number;
  };
}

/**
 * Extrait l'état workflow actuel d'un projet à partir de son historique
 */
function getEtatWorkflowActuel(project: any): string | null {
  const history = project?.data?.history;
  if (!Array.isArray(history) || history.length === 0) return null;

  // Filtrer les événements de type transition workflow (kind === 2)
  const transitionEvents = history.filter((h: any) => 
    h?.kind === 2 && typeof h?.labelKind === 'string' && h.labelKind.includes('=>')
  );

  if (transitionEvents.length === 0) return null;

  // Prendre le dernier événement (le plus récent)
  const lastEvent = transitionEvents[transitionEvents.length - 1];
  const labelKind = lastEvent.labelKind as string;

  // Parser "ÉTAT_AVANT => ÉTAT_APRÈS"
  const parts = labelKind.split('=>');
  if (parts.length < 2) return null;

  return parts[1].trim();
}

/**
 * Vérifie si un projet est annulé
 */
function isProjectCanceled(project: any): boolean {
  const state = project?.state?.toLowerCase?.();
  return state === 'canceled' || state === 'cancelled';
}

/**
 * Recherche récursive des blocs chiffrage dans une structure de données
 */
function findChiffrageBlocks(obj: any, blocks: { nbHeures: number; nbTechs: number }[] = []): { nbHeures: number; nbTechs: number }[] {
  if (!obj || typeof obj !== 'object') return blocks;

  // Check si c'est un bloc chiffrage
  if (obj.IS_BLOCK === true && obj.slug === 'chiffrage' && obj.data) {
    const data = obj.data;
    const nbHeures = parseFloat(data.nbHeures) || 0;
    const nbTechs = typeof data.nbTechs === 'number' ? data.nbTechs : 1;
    
    if (nbHeures > 0) {
      blocks.push({ nbHeures, nbTechs });
    }
  }

  // Recherche récursive
  if (Array.isArray(obj)) {
    for (const item of obj) {
      findChiffrageBlocks(item, blocks);
    }
  } else {
    for (const key of Object.keys(obj)) {
      if (key !== 'history') { // Éviter de parser l'historique
        findChiffrageBlocks(obj[key], blocks);
      }
    }
  }

  return blocks;
}

/**
 * Extrait nbHeures et nbTechs depuis une intervention (RT)
 */
function extractRTDataFromIntervention(intervention: any): { heuresRdv: number; heuresTech: number } {
  let totalHeuresRdv = 0;
  let totalHeuresTech = 0;

  // Recherche dans data
  const blocks = findChiffrageBlocks(intervention?.data);
  
  // Recherche aussi dans docsCommanditaireBefore et After
  findChiffrageBlocks(intervention?.docsCommanditaireBefore, blocks);
  findChiffrageBlocks(intervention?.docsCommanditaireAfter, blocks);
  
  // Recherche dans subItems si présent
  findChiffrageBlocks(intervention?.subItems, blocks);
  
  // Recherche à la racine aussi (certains RT ont les données directement)
  if (intervention?.data?.nbHeures || intervention?.nbHeures) {
    const nbHeures = parseFloat(intervention?.data?.nbHeures ?? intervention?.nbHeures) || 0;
    const nbTechs = intervention?.data?.nbTechs ?? intervention?.nbTechs ?? 1;
    if (nbHeures > 0 && !blocks.some(b => b.nbHeures === nbHeures)) {
      blocks.push({ nbHeures, nbTechs: typeof nbTechs === 'number' ? nbTechs : 1 });
    }
  }

  for (const block of blocks) {
    totalHeuresRdv += block.nbHeures;
    totalHeuresTech += block.nbHeures * block.nbTechs;
  }

  return { heuresRdv: totalHeuresRdv, heuresTech: totalHeuresTech };
}

/**
 * Normalise un nom d'univers
 */
function normalizeUnivers(univers: string): string {
  const mapping: Record<string, string> = {
    'ame_logement': 'PMR',
    'amelioration_logement': 'PMR',
    'pmr': 'PMR',
    'renovation': 'Rénovation',
    'plomberie': 'Plomberie',
    'electricite': 'Électricité',
    'serrurerie': 'Serrurerie',
    'recherche_fuite': 'Recherche de fuite',
    'vitrerie': 'Vitrerie',
    'multiservice': 'Multiservice',
  };
  
  const normalized = univers.toLowerCase().trim();
  return mapping[normalized] || univers;
}

/**
 * Calcule la charge de travaux à venir par univers
 */
export function computeChargeTravauxAvenirParUnivers(
  projects: any[],
  interventions: any[]
): ChargeTravauxResult {
  const debug = {
    totalProjects: projects.length,
    projectsEligibleState: 0,
    projectsAvecRT: 0,
    rtBlocksCount: 0
  };

  const parProjet: ChargeTravauxProjet[] = [];
  const universMap = new Map<string, ChargeTravauxUniversStats>();

  // Index des interventions par projectId
  const interventionsByProject = new Map<string | number, any[]>();
  for (const interv of interventions) {
    const pid = interv?.projectId ?? interv?.project_id;
    if (pid) {
      if (!interventionsByProject.has(pid)) {
        interventionsByProject.set(pid, []);
      }
      interventionsByProject.get(pid)!.push(interv);
    }
  }

  for (const project of projects) {
    // Vérifier si le projet est annulé
    if (isProjectCanceled(project)) continue;

    // Déterminer l'état workflow actuel
    const etatWorkflow = getEtatWorkflowActuel(project);
    if (!etatWorkflow || !ETATS_ELIGIBLES.includes(etatWorkflow)) continue;

    debug.projectsEligibleState++;

    // Récupérer les interventions du projet
    const projectInterventions = interventionsByProject.get(project.id) || [];
    
    let totalHeuresRdv = 0;
    let totalHeuresTech = 0;

    for (const interv of projectInterventions) {
      const rtData = extractRTDataFromIntervention(interv);
      if (rtData.heuresRdv > 0) {
        debug.rtBlocksCount++;
      }
      totalHeuresRdv += rtData.heuresRdv;
      totalHeuresTech += rtData.heuresTech;
    }

    // Même sans RT, on compte le dossier (charge = 0)
    const universes = (project?.data?.universes as string[]) || ['Non classé'];
    const normalizedUniverses = universes.map(normalizeUnivers);

    if (totalHeuresRdv > 0 || totalHeuresTech > 0) {
      debug.projectsAvecRT++;
    }

    parProjet.push({
      projectId: project.id,
      reference: project.ref || project.reference,
      label: project.label || project.name,
      etatWorkflow,
      universes: normalizedUniverses,
      totalHeuresRdv,
      totalHeuresTech
    });

    // Ventilation par univers (répartition égale si multiple)
    const universeCount = normalizedUniverses.length || 1;
    const heuresRdvShare = totalHeuresRdv / universeCount;
    const heuresTechShare = totalHeuresTech / universeCount;

    for (const univers of normalizedUniverses) {
      if (!universMap.has(univers)) {
        universMap.set(univers, {
          univers,
          nbDossiers: 0,
          totalHeuresRdv: 0,
          totalHeuresTech: 0,
          totalHeuresTech_A_planifier_TVX: 0,
          totalHeuresTech_A_commander: 0,
          totalHeuresTech_En_attente_fournitures: 0
        });
      }

      const stats = universMap.get(univers)!;
      stats.nbDossiers++;
      stats.totalHeuresRdv += heuresRdvShare;
      stats.totalHeuresTech += heuresTechShare;

      // Ventilation par état
      if (etatWorkflow === 'À planifier TVX') {
        stats.totalHeuresTech_A_planifier_TVX += heuresTechShare;
      } else if (etatWorkflow === 'À commander') {
        stats.totalHeuresTech_A_commander += heuresTechShare;
      } else if (etatWorkflow === 'En attente fournitures') {
        stats.totalHeuresTech_En_attente_fournitures += heuresTechShare;
      }
    }
  }

  const parUnivers = Array.from(universMap.values())
    .sort((a, b) => b.totalHeuresTech - a.totalHeuresTech);

  const totaux = {
    totalHeuresRdv: parProjet.reduce((sum, p) => sum + p.totalHeuresRdv, 0),
    totalHeuresTech: parProjet.reduce((sum, p) => sum + p.totalHeuresTech, 0),
    nbDossiers: parProjet.length
  };

  return {
    parUnivers,
    parProjet,
    totaux,
    debug
  };
}
