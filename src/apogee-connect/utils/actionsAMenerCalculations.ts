import { addDays, parseISO, isValid, differenceInDays } from 'date-fns';
import { ActionRow, ActionsConfig, DEFAULT_CONFIG, ACTION_LABELS } from '../types/actions';

/**
 * Parse une date depuis différents formats possibles
 */
function parseDate(dateValue: any): Date | null {
  if (!dateValue) return null;
  
  if (dateValue instanceof Date) return dateValue;
  
  if (typeof dateValue === 'string') {
    // Format ISO
    const isoDate = parseISO(dateValue);
    if (isValid(isoDate)) return isoDate;
    
    // Format français DD/MM/YYYY
    const parts = dateValue.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      const frDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (isValid(frDate)) return frDate;
    }
  }
  
  return null;
}

/**
 * Normalise le statut d'un projet (insensible à la casse et accents)
 */
function normalizeStatus(status: string | undefined): string {
  if (!status) return '';
  return status
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Construit la liste des actions à mener pour une agence
 */
export function buildActionsAMener(
  projects: any[],
  devis: any[],
  factures: any[],
  clients: any[],
  config: ActionsConfig = DEFAULT_CONFIG,
  today: Date = new Date()
): ActionRow[] {
  const actions: ActionRow[] = [];
  
  // Map des clients pour recherche rapide
  const clientsMap = new Map(clients.map(c => [c.id, c]));
  
  // Map des devis par projectId
  const devisByProject = new Map<number, any[]>();
  devis.forEach(d => {
    if (!d.projectId) return;
    if (!devisByProject.has(d.projectId)) {
      devisByProject.set(d.projectId, []);
    }
    devisByProject.get(d.projectId)!.push(d);
  });
  
  // Map des factures par projectId
  const facturesByProject = new Map<number, any[]>();
  factures.forEach(f => {
    if (!f.projectId) return;
    if (!facturesByProject.has(f.projectId)) {
      facturesByProject.set(f.projectId, []);
    }
    facturesByProject.get(f.projectId)!.push(f);
  });
  
  // Parcourir tous les projets
  projects.forEach(project => {
    // Ignorer les projets clôturés/archivés
    const status = normalizeStatus(project.state || project.data?.etape || project.data?.step);
    if (status.includes('clotur') || status.includes('archive') || status.includes('annule')) {
      return;
    }
    
    // Récupérer le nom du client
    const clientId = project.clientId || project.client_id || project.data?.commanditaireId;
    const client = clientId ? clientsMap.get(clientId) : null;
    const clientName = client?.nom || client?.name || client?.raisonSociale || 'Client inconnu';
    
    const ref = project.ref || `#${project.id}`;
    const label = project.name || project.label || 'Sans libellé';
    
    // === RÈGLE 1: Dossiers en "devis à faire" ===
    // Filtrer uniquement les changements de statut (kind === 2) et prendre le dernier
    if (project.data?.history && Array.isArray(project.data.history)) {
      // Filtrer uniquement les changements de statut
      const statusChanges = project.data.history
        .filter((h: any) => h.kind === 2 && typeof h.labelKind === 'string')
        .sort((a: any, b: any) => {
          const dateA = parseDate(a.dateModif);
          const dateB = parseDate(b.dateModif);
          if (!dateA || !dateB) return 0;
          return dateA.getTime() - dateB.getTime(); // Tri croissant
        });
      
      // Vérifier si le dernier changement de statut se termine par " => Devis à faire"
      if (statusChanges.length > 0) {
        const lastStatus = statusChanges[statusChanges.length - 1];
        if (lastStatus.labelKind && lastStatus.labelKind.includes(' => Devis à faire')) {
          const dateDepart = parseDate(lastStatus.dateModif) || parseDate(project.updated_at) || parseDate(project.created_at);
          if (dateDepart) {
            const deadline = addDays(dateDepart, config.delai_devis_a_faire);
            const isLate = deadline < today;
            
            actions.push({
              projectId: project.id,
              ref,
              label,
              statut: 'Devis à faire',
              actionLabel: ACTION_LABELS.devis_a_faire,
              actionType: 'devis_a_faire',
              deadline,
              dateDepart,
              isLate,
              clientName,
              daysLate: isLate ? differenceInDays(today, deadline) : 0,
            });
          }
        }
      }
    }
    
    // === RÈGLE 2: Dossiers en "à facturer" ===
    // Même logique que "devis à faire" : vérifier l'historique
    if (project.data?.history && Array.isArray(project.data.history)) {
      const statusChanges = project.data.history
        .filter((h: any) => h.kind === 2 && typeof h.labelKind === 'string')
        .sort((a: any, b: any) => {
          const dateA = parseDate(a.dateModif);
          const dateB = parseDate(b.dateModif);
          if (!dateA || !dateB) return 0;
          return dateA.getTime() - dateB.getTime();
        });
      
      if (statusChanges.length > 0) {
        const lastStatus = statusChanges[statusChanges.length - 1];
        if (lastStatus.labelKind && lastStatus.labelKind.includes(' => À facturer')) {
          const dateDepart = parseDate(lastStatus.dateModif) || parseDate(project.updated_at) || parseDate(project.created_at);
          if (dateDepart) {
            const deadline = addDays(dateDepart, config.delai_a_facturer);
            const isLate = deadline < today;
            
            actions.push({
              projectId: project.id,
              ref,
              label,
              statut: 'À facturer',
              actionLabel: ACTION_LABELS.a_facturer,
              actionType: 'a_facturer',
              deadline,
              dateDepart,
              isLate,
              clientName,
              daysLate: isLate ? differenceInDays(today, deadline) : 0,
            });
          }
        }
      }
    }
  });
  
  // === RÈGLE 3: Dossiers en attente technicien "ATT TECH (manuel)" ou "RT en cours" ===
  projects.forEach(project => {
    if (!project.data?.history || !Array.isArray(project.data.history)) return;
    
    const history = project.data.history;
    
    // Fonction pour parser les dates au format "DD/MM/YYYY HH:mm:ss"
    const parseDateModif = (dateStr: string): number => {
      const [d, t] = dateStr.split(" ");
      const [j, m, a] = d.split("/").map(Number);
      const [h, mi, s] = t.split(":").map(Number);
      return new Date(a, m - 1, j, h, mi, s).getTime();
    };
    
    // 1) Filtrer les changements de statut (kind === 2)
    const statusChanges = history
      .filter((h: any) => h.kind === 2 && typeof h.labelKind === 'string')
      .sort((a: any, b: any) => {
        const dateA = a.dateModif ? parseDateModif(a.dateModif) : 0;
        const dateB = b.dateModif ? parseDateModif(b.dateModif) : 0;
        return dateA - dateB;
      });
    
    if (statusChanges.length === 0) return;
    
    const lastStatusChange = statusChanges[statusChanges.length - 1];
    
    // 2) Vérifier que le dernier statut est "=> ATT TECH (manuel)" ou "=> RT en cours"
    const isAttTech = lastStatusChange.labelKind && lastStatusChange.labelKind.includes('=> ATT TECH (manuel)');
    const isRtEnCours = lastStatusChange.labelKind && lastStatusChange.labelKind.includes('=> RT en cours');
    
    if (!isAttTech && !isRtEnCours) {
      return;
    }
    
    const statusTime = lastStatusChange.dateModif ? parseDateModif(lastStatusChange.dateModif) : 0;
    const statutLabel = isAttTech ? 'En attente technicien' : 'Retour technicien en cours';
    
    // 3) Essayer d'abord le userStr/userId du changement de statut lui-même
    let technicienName = lastStatusChange.userStr || 'Technicien inconnu';
    let technicienId: number | undefined = lastStatusChange.userId;
    
    // 4) Si pas de technicien dans le statut, chercher le dernier RDV réalisé (kind === 14) avant le passage à ce statut
    if (!lastStatusChange.userStr || lastStatusChange.userStr === 'Technicien inconnu') {
      const rdvEntries = history
        .filter((h: any) => 
          h.kind === 14 &&
          h.data &&
          typeof h.data.content === 'string' &&
          h.data.content.includes('R.D.V. : Planifié => Réalisé')
        )
        .sort((a: any, b: any) => {
          const dateA = a.dateModif ? parseDateModif(a.dateModif) : 0;
          const dateB = b.dateModif ? parseDateModif(b.dateModif) : 0;
          return dateA - dateB;
        });
      
      if (rdvEntries.length > 0) {
        // Ne garder que les RDV avant ou à la même date que le statut
        const rdvAvant = rdvEntries.filter((h: any) => {
          const rdvTime = h.dateModif ? parseDateModif(h.dateModif) : 0;
          return rdvTime <= statusTime;
        });
        
        if (rdvAvant.length > 0) {
          const lastRdv = rdvAvant[rdvAvant.length - 1];
          technicienName = lastRdv.userStr || lastRdv.data?.userName || 'Technicien inconnu';
          technicienId = lastRdv.userId;
        }
      }
    }
    
    // Créer l'action de relance technicien
    const clientId = project.clientId || project.client_id || project.data?.commanditaireId;
    const client = clientId ? clientsMap.get(clientId) : null;
    const clientName = client?.nom || client?.name || client?.raisonSociale || 'Client inconnu';
    const ref = project.ref || `#${project.id}`;
    const label = project.name || project.label || 'Sans libellé';
    
    const dateDepart = parseDate(lastStatusChange.dateModif) || today;
    const deadline = addDays(dateDepart, config.delai_relance_technicien);
    const isLate = deadline < today;
    
    actions.push({
      projectId: project.id,
      ref,
      label,
      statut: statutLabel,
      actionLabel: ACTION_LABELS.relance_technicien,
      actionType: 'relance_technicien',
      deadline,
      dateDepart,
      isLate,
      clientName,
      technicienName,
      technicienId,
      daysLate: isLate ? differenceInDays(today, deadline) : 0,
    });
  });
  
  // === RÈGLE 4 & 5: Dossiers "À planifier travaux" et "À commander" — top 10 plus anciens ===
  const aPlanifierCandidates: ActionRow[] = [];
  const aCommanderCandidates: ActionRow[] = [];
  
  projects.forEach(project => {
    const rawState = (project.state || project.data?.etape || project.data?.step || '').toString().toLowerCase().trim();
    const status = normalizeStatus(rawState);
    if (status.includes('clotur') || status.includes('archive') || status.includes('annule')) return;
    
    const clientId = project.clientId || project.client_id || project.data?.commanditaireId;
    const client = clientId ? clientsMap.get(clientId) : null;
    const clientName = client?.nom || client?.name || client?.raisonSociale || 'Client inconnu';
    const ref = project.ref || `#${project.id}`;
    const label = project.name || project.label || 'Sans libellé';
    
    // Détection par STATE du projet (pas par historique)
    const isAPlanifier = rawState === 'to_planify_tvx' || rawState === 'to_planify' || rawState === 'a planifier travaux' || rawState === 'a_planifier_tvx';
    const isACommander = rawState === 'devis_to_order' || rawState === 'to_order' || rawState === 'a commander' || rawState === 'a_commander';
    
    if (!isAPlanifier && !isACommander) return;
    
    // Chercher la date d'entrée dans l'état via l'historique (kind === 2)
    let dateDepart: Date = parseDate(project.updated_at) || parseDate(project.created_at) || today;
    const history = project.data?.history;
    if (Array.isArray(history)) {
      const statusChanges = history
        .filter((h: any) => h.kind === 2 && typeof h.labelKind === 'string')
        .sort((a: any, b: any) => {
          const dA = parseDate(a.dateModif);
          const dB = parseDate(b.dateModif);
          return (dA?.getTime() || 0) - (dB?.getTime() || 0);
        });
      
      // Prendre le dernier changement de statut comme date d'entrée
      if (statusChanges.length > 0) {
        const last = statusChanges[statusChanges.length - 1];
        const parsed = parseDate(last.dateModif);
        if (parsed) dateDepart = parsed;
      }
    }
    
    const daysInState = differenceInDays(today, dateDepart);
    
    if (isAPlanifier) {
      const deadline = addDays(dateDepart, config.delai_a_planifier_tvx);
      const isLate = deadline < today;
      aPlanifierCandidates.push({
        projectId: project.id,
        ref,
        label,
        statut: 'À planifier travaux',
        actionLabel: ACTION_LABELS.a_planifier_tvx,
        actionType: 'a_planifier_tvx',
        deadline,
        dateDepart,
        isLate,
        clientName,
        daysLate: isLate ? differenceInDays(today, deadline) : daysInState,
      });
    }
    
    if (isACommander) {
      const deadline = addDays(dateDepart, config.delai_a_commander);
      const isLate = deadline < today;
      aCommanderCandidates.push({
        projectId: project.id,
        ref,
        label,
        statut: 'À commander',
        actionLabel: ACTION_LABELS.a_commander,
        actionType: 'a_commander',
        deadline,
        dateDepart,
        isLate,
        clientName,
        daysLate: isLate ? differenceInDays(today, deadline) : daysInState,
      });
    }
  });
  
  // Ajouter tous les candidats (plus de limite à 10)
  actions.push(...aPlanifierCandidates);
  actions.push(...aCommanderCandidates);
  
  // Marquer les actions qui vont passer en retard dans J+1 et filtrer
  const tomorrow = addDays(today, 1);
  const threeDaysFromNow = addDays(today, 3);
  const filteredActions = actions
    .map(action => ({
      ...action,
      isDueSoon: !action.isLate && action.deadline <= threeDaysFromNow,
    }))
    .filter(action => {
      if (action.isLate) return true;
      // Garder les actions dont la deadline est dans 3 jours max
      return action.deadline <= threeDaysFromNow;
    });
  
  // Trier : en retard (isLate) d'abord par daysLate décroissant, puis les autres par daysLate décroissant
  filteredActions.sort((a, b) => {
    // Les en retard en premier
    if (a.isLate && !b.isLate) return -1;
    if (!a.isLate && b.isLate) return 1;
    // Au sein du même groupe, par daysLate décroissant
    const daysA = a.daysLate ?? 0;
    const daysB = b.daysLate ?? 0;
    return daysB - daysA;
  });
  
  return filteredActions;
}

/**
 * Calcule les statistiques pour la tuile de la landing page
 */
export function calculateActionsStats(actions: ActionRow[]) {
  const facturesAFaire = actions.filter(a => a.actionType === 'a_facturer' && a.isLate).length;
  const dossiersEnRetard = actions.filter(a => a.isLate).length;
  const totalActions = actions.length;
  
  return {
    facturesAFaire,
    dossiersEnRetard,
    totalActions,
  };
}
