import { api } from "./api";
import { GlobalFilters } from "@/apogee-connect/contexts/FiltersContext";
import { isWithinInterval, parseISO } from "date-fns";

export class DataService {
  // Cache des données brutes
  private static cache: {
    users?: any[];
    clients?: any[];
    projects?: any[];
    interventions?: any[];
    factures?: any[];
    devis?: any[];
    creneaux?: any[];
  } = {};

  // Vider le cache
  static clearCache() {
    console.log('🗑️ Vidage du cache DataService');
    this.cache = {};
  }

  // Charger toutes les données
  static async loadAllData(isApiEnabled: boolean = true) {
    // GUARD: Vérifier si BASE_URL est définie avant de faire des appels
    const { getApiBaseUrl } = await import('./api');
    const baseUrl = getApiBaseUrl();
    
    if (!baseUrl) {
      console.warn('⚠️ BASE_URL non définie - Aucun appel API ne sera effectué');
      return {
        users: [],
        clients: [],
        projects: [],
        interventions: [],
        factures: [],
        devis: [],
        creneaux: []
      };
    }
    
    // Si l'API est désactivée et qu'on a déjà des données en cache, on les retourne
    if (!isApiEnabled && Object.keys(this.cache).length > 0 && this.cache.users?.length) {
      console.log('🔇 API désactivée - Utilisation du cache existant');
      return this.cache;
    }

    if (!isApiEnabled) {
      console.log('🔇 API désactivée - Aucune donnée en cache disponible');
      return this.cache;
    }

    console.log('🔄 Chargement des données API...');
    
    const results = await Promise.allSettled([
      api.getUsers(),
      api.getClients(),
      api.getProjects(),
      api.getInterventions(),
      api.getFactures(),
      api.getDevis(),
      api.getInterventionsCreneaux(),
    ]);

    const [usersRes, clientsRes, projectsRes, interventionsRes, facturesRes, devisRes, creneauxRes] = results.map((res, index) => {
      if (res.status === 'fulfilled') return res.value;
      console.warn(`⚠️ Erreur lors de l'appel API #${index}:`, res.reason);
      return [];
    });

    console.log('📦 Réponses API brutes:', {
      users: usersRes,
      clients: clientsRes,
      projects: projectsRes,
      interventions: interventionsRes,
      factures: facturesRes,
      devis: devisRes,
      creneaux: creneauxRes,
    });

    // Extraire les données (l'API peut retourner un objet avec une clé 'data' ou directement un array)
    const extractData = (response: any) => {
      if (!response) return [];
      if (Array.isArray(response)) return response;
      if (response.data && Array.isArray(response.data)) return response.data;
      if (response.success && response.data && Array.isArray(response.data)) return response.data;
      console.warn('⚠️ Format de réponse inattendu:', response);
      return [];
    };

    // Importer la fonction d'exclusion de la facture fictive
    const { isFictitiousTransferInvoice } = await import('../config/manualOverrides');
    
    // Extraire et filtrer les factures (exclure la facture fictive de transfert)
    const allFactures = extractData(facturesRes);
    const facturesFiltered = allFactures.filter((facture: any) => {
      const isFictitious = isFictitiousTransferInvoice(facture);
      if (isFictitious) {
        console.log('🚫 Exclusion de la facture fictive de transfert comptable:', {
          id: facture.id,
          reference: facture.reference,
          montant: facture.totalHT || facture.data?.totalHT
        });
      }
      return !isFictitious;
    });

    this.cache = { 
      users: extractData(usersRes),
      clients: extractData(clientsRes),
      projects: extractData(projectsRes),
      interventions: extractData(interventionsRes),
      factures: facturesFiltered,
      devis: extractData(devisRes),
      creneaux: extractData(creneauxRes),
    };

    console.log('✅ Données extraites:', {
      users: this.cache.users.length,
      clients: this.cache.clients.length,
      projects: this.cache.projects.length,
      interventions: this.cache.interventions.length,
      factures: this.cache.factures.length,
      devis: this.cache.devis.length,
      creneaux: this.cache.creneaux.length,
    });

    // Initialiser le service d'enrichissement
    const { EnrichmentService } = await import('./enrichmentService');
    EnrichmentService.initialize({
      users: this.cache.users,
      clients: this.cache.clients,
      projects: this.cache.projects,
    });

    return this.cache;
  }

  // Filtrer par date
  static filterByDateRange(items: any[], filters: GlobalFilters, dateField: string = 'date') {
    if (!items || items.length === 0) {
      console.log(`⚠️ Aucun item à filtrer pour le champ ${dateField}`);
      return [];
    }

    const filtered = items.filter(item => {
      const dateValue = item[dateField];
      if (!dateValue) {
        // Essayer d'autres formats de date possibles
        const altDate = item.dateIntervention || item.dateReelle || item.created_at || item.updated_at;
        if (!altDate) return false;
        
        try {
          const itemDate = parseISO(altDate);
          return isWithinInterval(itemDate, { 
            start: filters.dateRange.start, 
            end: filters.dateRange.end 
          });
        } catch (e) {
          return false;
        }
      }

      try {
        const itemDate = parseISO(dateValue);
        return isWithinInterval(itemDate, { 
          start: filters.dateRange.start, 
          end: filters.dateRange.end 
        });
      } catch (e) {
        console.warn(`⚠️ Date invalide pour ${dateField}:`, dateValue);
        return false;
      }
    });

    console.log(`📅 Filtrage par date (${dateField}): ${items.length} → ${filtered.length} items`);
    return filtered;
  }

  // Jointures et agrégations
  static getFactureTotalHT(facture: any): number {
    if (!facture) return 0;
    if (typeof facture.totalHT === 'number') return facture.totalHT;
    if (typeof facture.totalHT === 'string') return parseFloat(facture.totalHT) || 0;
    if (facture.data?.totalHT) return parseFloat(facture.data.totalHT) || 0;
    if (facture.data?.totalBrutHT) return parseFloat(facture.data.totalBrutHT) || 0;
    if (Array.isArray(facture.items)) {
      return facture.items.reduce((sum: number, item: any) => sum + (item.totalHt || 0), 0);
    }
    return 0;
  }

  // Jointures et agrégations
  static getProjectWithDetails(projectId: string) {
    const project = this.cache.projects?.find(p => p.id === projectId);
    if (!project) return null;

    const client = this.cache.clients?.find(c => c.id === project.clientId);
    const interventions = this.cache.interventions?.filter(i => i.projectId === projectId);
    const factures = this.cache.factures?.filter(f => f.projectId === projectId);
    const devis = this.cache.devis?.filter(d => d.projectId === projectId);

    return { project, client, interventions, factures, devis };
  }

  // CA par technicien (ALGORITHME MÉTIER BASÉ SUR LE TEMPS)
  static calculateCAByTechnician(filters: GlobalFilters) {
    const factures = this.filterByDateRange(this.cache.factures || [], filters);
    console.log(`💰 Calcul CA par technicien: ${factures.length} factures`);
    
    const caByTech: Record<string, number> = {};
    const statsParTech: Record<string, { nbFactures: number, minutesTotal: number, caTotal: number }> = {};
    let caTotalPeriode = 0;
    let nbFacturesTraitees = 0;

    factures.forEach(facture => {
      // 1. Périmètre du CA
      const typeFacture = facture.typeFacture || facture.type || 'facture';
      let totalHT = this.getFactureTotalHT(facture);
      
      // Avoirs en négatif
      if (typeFacture === 'avoir') {
        totalHT = -Math.abs(totalHT);
      }
      
      caTotalPeriode += totalHT;

      const project = this.cache.projects?.find(p => p.id === facture.projectId);
      if (!project) return;

      // 2. Sélection des interventions productives (exclure RT)
      const allInterventions = this.cache.interventions?.filter(i => i.projectId === project.id) || [];
      const interventionsProductives = allInterventions.filter(interv => {
        // Exclure les relevés techniques
        const type2 = interv.type2 || '';
        const type = interv.type || '';
        
        // RT explicite
        if (type2.toLowerCase().includes('relevé') || type2.toLowerCase().includes('technique')) return false;
        if (type.toLowerCase().includes('rt')) return false;
        if (interv.data?.biRt && !interv.data?.biDepan && !interv.data?.biTvx && !interv.data?.biV3) return false;
        if (interv.data?.isRT) return false;
        
        // Cas "RDV à définir" : inclure si travaux réalisés
        if (type2.toLowerCase().includes('définir') || type2.toLowerCase().includes('a définir')) {
          const hasDepanWork = interv.data?.biDepan?.isWorkDone || interv.data?.biDepan?.tvxEffectues;
          const hasTvxWork = interv.data?.biTvx?.isWorkDone || interv.data?.biTvx?.tvxEffectues;
          const hasV3Work = interv.data?.biV3?.items?.length > 0;
          return hasDepanWork || hasTvxWork || hasV3Work;
        }
        
        return true; // Inclure par défaut (dépannages, travaux)
      });

      if (interventionsProductives.length === 0) return;

      nbFacturesTraitees++;

      // 3. Calcul du temps par technicien pour ce dossier
      const minutesTechProjet: Record<string, number> = {};
      
      interventionsProductives.forEach(interv => {
        let tempsReparti = false;

        // Priorité 1 : biV3 avec techTimeStart/techTimeEnd
        if (interv.data?.biV3?.items && Array.isArray(interv.data.biV3.items)) {
          interv.data.biV3.items.forEach((item: any) => {
            if (item.techTimeStart && item.techTimeEnd && item.usersIds) {
              const start = new Date(item.techTimeStart).getTime();
              const end = new Date(item.techTimeEnd).getTime();
              const dureeMinutes = (end - start) / (1000 * 60);
              const nbTechs = item.usersIds.length || 1;
              const dureeParTech = dureeMinutes / nbTechs;
              
              item.usersIds.forEach((techId: string) => {
                minutesTechProjet[techId] = (minutesTechProjet[techId] || 0) + dureeParTech;
              });
              tempsReparti = true;
            }
          });
        }

        // Priorité 2 : data.visites avec duree + usersIds
        if (!tempsReparti && interv.data?.visites && Array.isArray(interv.data.visites)) {
          interv.data.visites.forEach((visite: any) => {
            if (visite.duree && visite.usersIds) {
              const dureeMinutes = visite.duree;
              const nbTechs = visite.usersIds.length || 1;
              const dureeParTech = dureeMinutes / nbTechs;
              
              visite.usersIds.forEach((techId: string) => {
                minutesTechProjet[techId] = (minutesTechProjet[techId] || 0) + dureeParTech;
              });
              tempsReparti = true;
            }
          });
        }

        // Priorité 3 : créneaux
        if (!tempsReparti) {
          const creneaux = this.cache.creneaux?.filter(c => c.interventionId === interv.id) || [];
          creneaux.forEach(creneau => {
            if (creneau.duree && creneau.usersIds) {
              const dureeMinutes = creneau.duree;
              const nbTechs = creneau.usersIds.length || 1;
              const dureeParTech = dureeMinutes / nbTechs;
              
              creneau.usersIds.forEach((techId: string) => {
                minutesTechProjet[techId] = (minutesTechProjet[techId] || 0) + dureeParTech;
              });
              tempsReparti = true;
            }
          });
        }

        // Si aucune durée exploitable : collecter les techniciens pour partage égal
        if (!tempsReparti) {
          const techIds = new Set<string>();
          if (interv.userId) techIds.add(interv.userId);
          if (interv.usersIds) interv.usersIds.forEach((id: string) => techIds.add(id));
          if (interv.data?.visites) {
            interv.data.visites.forEach((v: any) => {
              if (v.usersIds) v.usersIds.forEach((id: string) => techIds.add(id));
            });
          }
          
          // Mode dégradé : 1 minute par tech
          techIds.forEach(techId => {
            minutesTechProjet[techId] = (minutesTechProjet[techId] || 0) + 1;
          });
        }
      });

      // Calcul total minutes dossier
      let minutesProjetTotales = Object.values(minutesTechProjet).reduce((sum, m) => sum + m, 0);
      
      if (minutesProjetTotales === 0) return; // Pas de techniciens identifiés

      // 4. Répartition du CA de la facture
      Object.entries(minutesTechProjet).forEach(([techId, minutes]) => {
        const ratio = minutes / minutesProjetTotales;
        const caTech = totalHT * ratio;
        caByTech[techId] = (caByTech[techId] || 0) + caTech;
        
        // Stats détaillées
        if (!statsParTech[techId]) {
          statsParTech[techId] = { nbFactures: 0, minutesTotal: 0, caTotal: 0 };
        }
        statsParTech[techId].nbFactures++;
        statsParTech[techId].minutesTotal += minutes;
        statsParTech[techId].caTotal += caTech;
      });
    });

    // 5. Arrondis et contrôle de cohérence
    const caByTechArrondi: Record<string, number> = {};
    Object.entries(caByTech).forEach(([techId, ca]) => {
      caByTechArrondi[techId] = Math.round(ca);
    });

    const caTechTotal = Object.values(caByTechArrondi).reduce((sum, ca) => sum + ca, 0);
    const caTotalArrondi = Math.round(caTotalPeriode);
    const diff = caTotalArrondi - caTechTotal;

    // Ajuster la différence sur le technicien avec le plus gros CA
    if (diff !== 0 && Object.keys(caByTechArrondi).length > 0) {
      const topTech = Object.entries(caByTechArrondi).sort((a, b) => b[1] - a[1])[0];
      caByTechArrondi[topTech[0]] += diff;
    }

    console.log(`✅ CA par technicien calculé (basé temps):`, caByTechArrondi);
    console.log(`   CA total période: ${Math.round(caTotalPeriode)} €, CA tech total: ${Object.values(caByTechArrondi).reduce((s, c) => s + c, 0)} €`);
    console.log(`   Factures traitées: ${nbFacturesTraitees}/${factures.length}`);
    console.log(`   📊 Stats détaillées par technicien (valeurs finales après arrondissement et ajustement):`);
    
    // Afficher les stats triées par CA décroissant en utilisant les valeurs finales
    Object.entries(caByTechArrondi)
      .sort(([, a], [, b]) => b - a)
      .forEach(([techId, caFinal]) => {
        const tech = this.cache.users?.find(u => u.id === parseInt(techId));
        const techName = tech ? `${tech.firstname} ${tech.name}` : `Tech ${techId}`;
        const stats = statsParTech[techId];
        const heures = stats ? Math.round(stats.minutesTotal / 60 * 10) / 10 : 0;
        const nbFact = stats ? stats.nbFactures : 0;
        console.log(`      ${techName}: ${caFinal}€ (${nbFact} factures, ${heures}h)`);
      });
    
    return caByTechArrondi;
  }

  // CA par univers
  static calculateCAByUniverse(filters: GlobalFilters) {
    const factures = this.filterByDateRange(this.cache.factures || [], filters);
    console.log(`🎯 Calcul CA par univers: ${factures.length} factures`);
    
    const caByUniverse: Record<string, number> = {};
    let nbFacturesSansProjet = 0;
    let nbFacturesAvecProjet = 0;
    const universesSet = new Set<string>();

    factures.forEach(facture => {
      const project = this.cache.projects?.find(p => p.id === facture.projectId);
      if (!project) {
        nbFacturesSansProjet++;
        return;
      }

      nbFacturesAvecProjet++;
      const universes = project.universes || project.data?.universes || ['Autre'];
      universes.forEach((u: string) => universesSet.add(u));
      
      const nbUniverses = universes.length || 1;
      const totalHT = this.getFactureTotalHT(facture);
      const caPerUniverse = totalHT / nbUniverses;

      universes.forEach((univers: string) => {
        caByUniverse[univers] = (caByUniverse[univers] || 0) + caPerUniverse;
      });
    });

    console.log(`✅ CA par univers calculé:`, caByUniverse);
    console.log(`   Factures: ${nbFacturesAvecProjet} avec dossier, ${nbFacturesSansProjet} sans dossier`);
    console.log(`   Univers uniques trouvés: ${Array.from(universesSet).join(', ')}`);
    return caByUniverse;
  }

  // CA par apporteur
  static calculateCAByApporteur(filters: GlobalFilters) {
    const factures = this.filterByDateRange(this.cache.factures || [], filters);
    const caByApporteur: Record<string, { ca: number; nom: string; nbProjects: number }> = {};

    factures.forEach(facture => {
      const project = this.cache.projects?.find(p => p.id === facture.projectId);
      if (!project) return;

      const apporteurId = project.commanditaireId || project.data?.commanditaireId || 'direct';
      const apporteur = this.cache.clients?.find(c => c.id === apporteurId);
      const nom = apporteur?.nom || apporteur?.raisonSociale || 'Direct';

      if (!caByApporteur[apporteurId]) {
        caByApporteur[apporteurId] = { ca: 0, nom, nbProjects: 0 };
      }

      caByApporteur[apporteurId].ca += this.getFactureTotalHT(facture);
      caByApporteur[apporteurId].nbProjects += 1;
    });

    return caByApporteur;
  }

  // Taux de transformation devis
  static calculateDevisTransformation(filters: GlobalFilters) {
    const devis = this.filterByDateRange(this.cache.devis || [], filters);
    const total = devis.length;
    
    const transformed = devis.filter(d => {
      // Devis accepté
      if (['accepted', 'order', 'factured'].includes(d.state)) return true;
      
      // Ou facture existe pour ce projet
      const hasFacture = this.cache.factures?.some(f => f.projectId === d.projectId);
      return hasFacture;
    }).length;

    return total > 0 ? (transformed / total) * 100 : 0;
  }

  // Stats paiements clients
  static calculateClientPaymentStats(filters: GlobalFilters) {
    const factures = this.filterByDateRange(this.cache.factures || [], filters);
    const statsByClient: Record<string, {
      nom: string;
      delaiMoyen: number;
      nbFactures: number;
      nbImpayees: number;
      montantTotal: number;
    }> = {};

    factures.forEach(facture => {
      const clientId = facture.clientId;
      const client = this.cache.clients?.find(c => c.id === clientId);
      
      if (!statsByClient[clientId]) {
        statsByClient[clientId] = {
          nom: client?.nom || client?.raisonSociale || 'Inconnu',
          delaiMoyen: 0,
          nbFactures: 0,
          nbImpayees: 0,
          montantTotal: 0,
        };
      }

      statsByClient[clientId].nbFactures += 1;
      statsByClient[clientId].montantTotal += facture.totalTTC || 0;

      if (facture.state !== 'paid' && !facture.isPaid) {
        statsByClient[clientId].nbImpayees += 1;
      }

      // Calcul délai (simplifié)
      if (facture.dateReelle && facture.date) {
        const delai = Math.floor((new Date(facture.dateReelle).getTime() - new Date(facture.date).getTime()) / (1000 * 60 * 60 * 24));
        statsByClient[clientId].delaiMoyen += delai;
      }
    });

    // Moyenne des délais
    Object.values(statsByClient).forEach(stats => {
      if (stats.nbFactures > 0) {
        stats.delaiMoyen = stats.delaiMoyen / stats.nbFactures;
      }
    });

    return statsByClient;
  }

  /**
   * UTILITAIRES DE DÉTECTION SAV, RT, DÉPANNAGE
   */
  
  // Vérifier si une intervention est un SAV
  static isSav(intervention: any, project?: any): boolean {
    // Méthode 1: type/type2 contient "SAV"
    const typeContainsSAV = 
      (intervention.type && intervention.type.toLowerCase().includes('sav')) ||
      (intervention.type2 && intervention.type2.toLowerCase().includes('sav'));
    
    // Méthode 2: flag SAV dans data
    const hasSAVFlag = 
      intervention.data?.isSav === true ||
      intervention.data?.isSAV === true ||
      intervention.data?.SAV === true ||
      intervention.data?.sav === true;
    
    // Méthode 3: sinistreTravauxType ou natureTravauxType
    const hasSAVNature =
      intervention.sinistreTravauxType?.toLowerCase().includes('sav') ||
      intervention.natureTravauxType?.toLowerCase().includes('sav');
    
    // Méthode 4: history contient SAV
    let hasSAVInHistory = false;
    if (intervention.history && Array.isArray(intervention.history)) {
      hasSAVInHistory = intervention.history.some((h: any) => 
        h.labelKind?.toLowerCase().includes('sav') ||
        h.content?.toLowerCase().includes('sav')
      );
    }
    
    // Méthode 5: project history contient SAV
    if (project && project.history && Array.isArray(project.history)) {
      const projectHistorySAV = project.history.some((h: any) =>
        h.labelKind?.toLowerCase().includes('sav') ||
        h.content?.toLowerCase().includes('sav')
      );
      if (projectHistorySAV) hasSAVInHistory = true;
    }
    
    return typeContainsSAV || hasSAVFlag || hasSAVNature || hasSAVInHistory;
  }

  // Vérifier si une intervention est un RT
  static isRT(intervention: any): boolean {
    const type2IsRT = 
      (intervention.type2 && (
        intervention.type2.toLowerCase().includes('relevé') ||
        intervention.type2.toLowerCase().includes('technique') ||
        intervention.type2.toLowerCase().includes('rt')
      ));
    
    const hasRTFlag =
      (intervention.data?.biRt && typeof intervention.data.biRt === 'object' && !intervention.data?.biDepan && !intervention.data?.biTvx && !intervention.data?.biV3) ||
      intervention.data?.isRT === true ||
      intervention.data?.rt === true;
    
    const typeIsRT = intervention.type && intervention.type.toLowerCase().includes('rt');
    
    return type2IsRT || hasRTFlag || typeIsRT;
  }

  // Vérifier si une intervention est un dépannage
  static isDepannage(intervention: any): boolean {
    const typeIsDepannage =
      (intervention.type && intervention.type.toLowerCase().includes('dépannage')) ||
      (intervention.type && intervention.type.toLowerCase().includes('depannage')) ||
      (intervention.type2 && intervention.type2.toLowerCase().includes('dépannage')) ||
      (intervention.type2 && intervention.type2.toLowerCase().includes('depannage'));
    
    const hasBiDepanWork =
      intervention.data?.biDepan &&
      (intervention.data.biDepan.isWorkDone || intervention.data.biDepan.tvxEffectues);
    
    return typeIsDepannage || hasBiDepanWork;
  }

  // Interventions SAV
  static getSAVInterventions(filters: GlobalFilters) {
    const interventions = this.filterByDateRange(this.cache.interventions || [], filters, 'dateIntervention');
    
    return interventions.filter(i => {
      const project = this.cache.projects?.find(p => p.id === i.projectId);
      return this.isSav(i, project);
    });
  }

  // RT réalisés
  static getRTInterventions(filters: GlobalFilters) {
    const interventions = this.filterByDateRange(this.cache.interventions || [], filters, 'dateIntervention');
    return interventions.filter(i => this.isRT(i));
  }

  // Dépannages réalisés
  static getDepannageInterventions(filters: GlobalFilters) {
    const interventions = this.filterByDateRange(this.cache.interventions || [], filters, 'dateIntervention');
    return interventions.filter(i => {
      // Dépannages terminés
      const isDone = i.state === 'done' || i.state === 'validated';
      return this.isDepannage(i) && isDone;
    });
  }

  // CA lié aux dossiers avec SAV
  static getCAFromSAVProjects(filters: GlobalFilters) {
    const savInterventions = this.getSAVInterventions(filters);
    const projectsWithSAV = new Set(savInterventions.map(i => i.projectId));
    
    const factures = this.filterByDateRange(this.cache.factures || [], filters);
    let caSAV = 0;
    
    factures.forEach(f => {
      if (projectsWithSAV.has(f.projectId)) {
        let totalHT = this.getFactureTotalHT(f);
        // Avoirs en négatif
        if (f.typeFacture === 'avoir') {
          totalHT = -Math.abs(totalHT);
        }
        caSAV += totalHT;
      }
    });
    
    return caSAV;
  }

  // Taux de transfo RDV "à définir"
  static calculateRDVTransformation(filters: GlobalFilters) {
    const interventions = this.filterByDateRange(this.cache.interventions || [], filters, 'dateIntervention');
    
    // RDV initialement "à définir"
    const rdvADefinir = interventions.filter(i => 
      i.type2?.toLowerCase().includes('définir') ||
      i.type2?.toLowerCase().includes('a définir')
    );
    
    let nbDevenuRT = 0;
    let nbDevenuDepannage = 0;
    
    rdvADefinir.forEach(i => {
      if (this.isRT(i)) {
        nbDevenuRT++;
      } else if (this.isDepannage(i) || i.data?.biTvx || i.data?.biV3?.items?.length > 0) {
        nbDevenuDepannage++;
      }
    });
    
    const total = rdvADefinir.length;
    return {
      total,
      nbDevenuRT,
      nbDevenuDepannage,
      tauxRT: total > 0 ? nbDevenuRT / total : 0,
      tauxDepannage: total > 0 ? nbDevenuDepannage / total : 0,
    };
  }
}
