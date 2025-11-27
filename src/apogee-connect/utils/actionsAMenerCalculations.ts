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
    // Vérifier data.history pour trouver le dernier état " => Devis à faire"
    if (project.data?.history && Array.isArray(project.data.history)) {
      // Trier l'historique par dateModif pour avoir le plus récent en premier
      const sortedHistory = [...project.data.history].sort((a, b) => {
        const dateA = parseDate(a.dateModif);
        const dateB = parseDate(b.dateModif);
        if (!dateA || !dateB) return 0;
        return dateB.getTime() - dateA.getTime();
      });
      
      // Vérifier si le dernier état contient exactement " => Devis à faire"
      if (sortedHistory.length > 0 && sortedHistory[0].labelKind) {
        const lastState = sortedHistory[0].labelKind;
        if (lastState.includes(' => Devis à faire')) {
          const dateDepart = parseDate(sortedHistory[0].dateModif) || parseDate(project.updated_at) || parseDate(project.created_at);
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
    
    // === RÈGLE 2: Dossiers en "devis envoyé" ===
    const hasDevisEnvoye = status.includes('devis') && status.includes('envoy');
    const projectDevis = devisByProject.get(project.id) || [];
    const devisEnvoyes = projectDevis.filter(d => {
      const dStatus = normalizeStatus(d.state);
      return dStatus.includes('sent') || dStatus.includes('envoy');
    });
    
    if ((hasDevisEnvoye || devisEnvoyes.length > 0)) {
      // Vérifier qu'il n'y a pas de facture acceptée/payée
      const projectFactures = facturesByProject.get(project.id) || [];
      const hasFactureAccepted = projectFactures.some(f => {
        const fStatus = normalizeStatus(f.state || '');
        return fStatus.includes('paid') || fStatus.includes('payment') || fStatus.includes('accept');
      });
      
      if (!hasFactureAccepted && devisEnvoyes.length > 0) {
        // Prendre le devis le plus récent
        const latestDevis = devisEnvoyes.sort((a, b) => {
          const dateA = parseDate(a.dateEnvoi || a.updated_at || a.created_at);
          const dateB = parseDate(b.dateEnvoi || b.updated_at || b.created_at);
          if (!dateA) return 1;
          if (!dateB) return -1;
          return dateB.getTime() - dateA.getTime();
        })[0];
        
        const dateDepart = parseDate(latestDevis.dateEnvoi || latestDevis.updated_at || latestDevis.created_at);
        if (dateDepart) {
          const deadline = addDays(dateDepart, config.delai_devis_envoye);
          const isLate = deadline < today;
          
          actions.push({
            projectId: project.id,
            ref,
            label,
            statut: 'Devis envoyé',
            actionLabel: ACTION_LABELS.devis_envoye,
            actionType: 'devis_envoye',
            deadline,
            dateDepart,
            isLate,
            clientName,
            daysLate: isLate ? differenceInDays(today, deadline) : 0,
          });
        }
      }
    }
    
    // === RÈGLE 3: Dossiers en "à facturer" ===
    if (status.includes('facturer')) {
      const dateDepart = parseDate(project.updated_at) || parseDate(project.created_at);
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
    
    // === RÈGLE 4: Dossiers en "à commander" ===
    if (status.includes('commander')) {
      const dateDepart = parseDate(project.updated_at) || parseDate(project.created_at);
      if (dateDepart) {
        const deadline = addDays(dateDepart, config.delai_a_commander);
        const isLate = deadline < today;
        
        actions.push({
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
          daysLate: isLate ? differenceInDays(today, deadline) : 0,
        });
      }
    }
  });
  
  // === RÈGLE 5: Factures non réglées ===
  factures.forEach(facture => {
    const fStatus = normalizeStatus(facture.state || '');
    if (fStatus.includes('payment') && fStatus.includes('wait')) {
      const project = projects.find(p => p.id === facture.projectId);
      if (!project) return;
      
      // Vérifier si c'est un particulier (pas d'apporteur)
      const clientId = project.clientId || project.client_id || project.data?.commanditaireId;
      const client = clientId ? clientsMap.get(clientId) : null;
      const isParticulier = !project.data?.commanditaireId;
      
      if (isParticulier) {
        const dateDepart = parseDate(facture.dateEmission || facture.dateReelle || facture.created_at);
        if (dateDepart) {
          const deadline = addDays(dateDepart, config.delai_facture_non_reglee);
          const isLate = deadline < today;
          
          if (isLate) {
            const clientName = client?.nom || client?.name || client?.raisonSociale || 'Client inconnu';
            const ref = project.ref || `#${project.id}`;
            const label = project.name || project.label || 'Sans libellé';
            
            actions.push({
              projectId: project.id,
              ref,
              label,
              statut: 'Facture en attente',
              actionLabel: ACTION_LABELS.facture_non_reglee,
              actionType: 'facture_non_reglee',
              deadline,
              dateDepart,
              isLate: true,
              clientName,
              daysLate: differenceInDays(today, deadline),
            });
          }
        }
      }
    }
  });
  
  // Trier par deadline croissante (plus urgentes en premier)
  actions.sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
  
  return actions;
}

/**
 * Calcule les statistiques pour la tuile de la landing page
 */
export function calculateActionsStats(actions: ActionRow[]) {
  const devisARelancer = actions.filter(a => a.actionType === 'devis_envoye' && a.isLate).length;
  const facturesAFaire = actions.filter(a => a.actionType === 'a_facturer' && a.isLate).length;
  const dossiersEnRetard = actions.filter(a => a.isLate).length;
  const totalActions = actions.length;
  
  return {
    devisARelancer,
    facturesAFaire,
    dossiersEnRetard,
    totalActions,
  };
}
