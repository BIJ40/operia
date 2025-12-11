import { apogeeProxy } from "@/services/apogeeProxy";
import { GlobalFilters } from "@/apogee-connect/contexts/FiltersContext";
import { isWithinInterval, parseISO } from "date-fns";
import { logApogee } from "@/lib/logger";
import type { User, Client, Project, Intervention, Facture, Devis, InterventionCreneau } from "../types";
import { z } from "zod";

// Schémas Zod pour validation minimale des réponses API (passthrough pour flexibilité)
const ProjectSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(v => String(v)),
}).passthrough();

const FactureSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(v => String(v)),
}).passthrough();

const InterventionSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(v => String(v)),
}).passthrough();

// Fonction de validation avec logging des erreurs
function validateAndCast<T>(data: unknown[], entityName: string, schema: z.ZodSchema): T[] {
  const validated: T[] = [];
  data.forEach((item, index) => {
    const result = schema.safeParse(item);
    if (result.success) {
      validated.push(result.data as T);
    } else {
      logApogee.warn(`[VALIDATION] ${entityName}[${index}] invalid:`, result.error.issues);
      // Inclure quand même pour ne pas perdre de données
      validated.push(item as T);
    }
  });
  return validated;
}
// TTL du cache en millisecondes (5 minutes)
const CACHE_TTL_MS = 5 * 60 * 1000;

/** Structure des données en cache */
export interface CachedData {
  users: User[];
  clients: Client[];
  projects: Project[];
  interventions: Intervention[];
  factures: Facture[];
  devis: Devis[];
  creneaux: InterventionCreneau[];
}

interface CacheEntry {
  data: CachedData;
  timestamp: number;
  agencyUrl: string;
}

/** Réponse API générique */
interface ApiResponse<T> {
  data?: T[];
  success?: boolean;
}

export class DataService {
  // Cache des données brutes avec TTL par agence
  private static cacheEntry: CacheEntry | null = null;
  
  // Cache en mémoire pour accès rapide (sans TTL check)
  private static cache: Partial<CachedData> = {};

  // Vérifier si le cache est valide
  private static isCacheValid(agencySlug?: string): boolean {
    if (!this.cacheEntry) return false;
    
    const currentAgency = agencySlug || 'default';
    const now = Date.now();
    const age = now - this.cacheEntry.timestamp;
    
    // Cache invalide si : agence différente OU TTL expiré
    if (this.cacheEntry.agencyUrl !== currentAgency) {
      logApogee.debug('Cache invalidé: agence différente');
      return false;
    }
    
    if (age > CACHE_TTL_MS) {
      logApogee.debug(`Cache expiré (âge: ${Math.round(age / 1000)}s, TTL: ${CACHE_TTL_MS / 1000}s)`);
      return false;
    }
    
    logApogee.debug(`Cache valide (âge: ${Math.round(age / 1000)}s/${CACHE_TTL_MS / 1000}s)`);
    return true;
  }

  // Vider le cache
  static clearCache() {
    logApogee.debug('Vidage du cache DataService');
    this.cache = {};
    this.cacheEntry = null;
  }
  
  // Obtenir l'âge du cache en secondes
  static getCacheAge(): number {
    if (!this.cacheEntry) return -1;
    return Math.round((Date.now() - this.cacheEntry.timestamp) / 1000);
  }
  
  // Forcer le rafraîchissement du cache
  static async refreshCache(): Promise<void> {
    logApogee.debug('Rafraîchissement forcé du cache');
    this.cacheEntry = null;
    await this.loadAllData(true);
  }

  // Charger toutes les données via le proxy sécurisé
  static async loadAllData(isApiEnabled: boolean = true, forceRefresh: boolean = false, agencySlug?: string) {
    // Si l'API est désactivée, utiliser le cache existant s'il existe
    if (!isApiEnabled && Object.keys(this.cache).length > 0 && this.cache.users?.length) {
      logApogee.debug('API désactivée - Utilisation du cache existant');
      return this.cache;
    }

    if (!isApiEnabled) {
      logApogee.debug('API désactivée - Aucune donnée en cache disponible');
      return this.cache;
    }
    
    // Vérifier si le cache est valide (TTL non expiré et même agence)
    if (!forceRefresh && this.isCacheValid(agencySlug) && this.cacheEntry) {
      logApogee.debug('Utilisation du cache (TTL valide)');
      this.cache = this.cacheEntry.data;
      return this.cache;
    }

    logApogee.info('Chargement des données via proxy sécurisé SÉQUENTIEL (cache expiré ou forcé)...');
    
    const proxyOptions = agencySlug ? { agencySlug } : undefined;
    const startTime = Date.now();
    
    // APPELS SÉQUENTIELS (un par un) pour éviter les rate limits 429
    let usersRes: any[] = [];
    let clientsRes: any[] = [];
    let projectsRes: any[] = [];
    let interventionsRes: any[] = [];
    let facturesRes: any[] = [];
    let devisRes: any[] = [];
    let creneauxRes: any[] = [];
    
    try {
      usersRes = await apogeeProxy.getUsers(proxyOptions) || [];
      logApogee.debug('[SEQUENTIAL] Users loaded:', usersRes.length);
    } catch (e) {
      logApogee.warn('[SEQUENTIAL] Users failed:', e);
    }
    
    try {
      clientsRes = await apogeeProxy.getClients(proxyOptions) || [];
      logApogee.debug('[SEQUENTIAL] Clients loaded:', clientsRes.length);
    } catch (e) {
      logApogee.warn('[SEQUENTIAL] Clients failed:', e);
    }
    
    try {
      projectsRes = await apogeeProxy.getProjects(proxyOptions) || [];
      logApogee.debug('[SEQUENTIAL] Projects loaded:', projectsRes.length);
    } catch (e) {
      logApogee.warn('[SEQUENTIAL] Projects failed:', e);
    }
    
    try {
      interventionsRes = await apogeeProxy.getInterventions(proxyOptions) || [];
      logApogee.debug('[SEQUENTIAL] Interventions loaded:', interventionsRes.length);
    } catch (e) {
      logApogee.warn('[SEQUENTIAL] Interventions failed:', e);
    }
    
    try {
      facturesRes = await apogeeProxy.getFactures(proxyOptions) || [];
      logApogee.debug('[SEQUENTIAL] Factures loaded:', facturesRes.length);
    } catch (e) {
      logApogee.warn('[SEQUENTIAL] Factures failed:', e);
    }
    
    try {
      devisRes = await apogeeProxy.getDevis(proxyOptions) || [];
      logApogee.debug('[SEQUENTIAL] Devis loaded:', devisRes.length);
    } catch (e) {
      logApogee.warn('[SEQUENTIAL] Devis failed:', e);
    }
    
    try {
      creneauxRes = await apogeeProxy.getInterventionsCreneaux(proxyOptions) || [];
      logApogee.debug('[SEQUENTIAL] Creneaux loaded:', creneauxRes.length);
    } catch (e) {
      logApogee.warn('[SEQUENTIAL] Creneaux failed:', e);
    }
    
    const duration = Date.now() - startTime;
    logApogee.info(`[SEQUENTIAL] Toutes les données chargées en ${duration}ms`);

    logApogee.debug('Réponses API brutes:', {
      users: Array.isArray(usersRes) ? usersRes.length : 0,
      clients: Array.isArray(clientsRes) ? clientsRes.length : 0,
      projects: Array.isArray(projectsRes) ? projectsRes.length : 0,
      interventions: Array.isArray(interventionsRes) ? interventionsRes.length : 0,
      factures: Array.isArray(facturesRes) ? facturesRes.length : 0,
      devis: Array.isArray(devisRes) ? devisRes.length : 0,
      creneaux: Array.isArray(creneauxRes) ? creneauxRes.length : 0,
    });

    // Extraire et valider les données
    const extractData = <T>(response: T[] | ApiResponse<T> | null): T[] => {
      if (!response) return [];
      if (Array.isArray(response)) return response;
      const apiRes = response as ApiResponse<T>;
      if (apiRes.data && Array.isArray(apiRes.data)) return apiRes.data;
      if (apiRes.success && apiRes.data && Array.isArray(apiRes.data)) return apiRes.data;
      logApogee.warn('Format de réponse inattendu:', response);
      return [];
    };

    // Validation Zod des entités critiques
    const rawProjects = extractData(projectsRes);
    const rawFactures = extractData(facturesRes);
    const rawInterventions = extractData(interventionsRes);

    this.cache = {
      users: extractData(usersRes),
      clients: extractData(clientsRes),
      projects: validateAndCast<Project>(rawProjects, 'Project', ProjectSchema),
      interventions: validateAndCast<Intervention>(rawInterventions, 'Intervention', InterventionSchema),
      factures: validateAndCast<Facture>(rawFactures, 'Facture', FactureSchema),
      devis: extractData(devisRes),
      creneaux: extractData(creneauxRes),
    };
    
    // Sauvegarder dans le cache avec TTL
    this.cacheEntry = {
      data: this.cache as CacheEntry['data'],
      timestamp: Date.now(),
      agencyUrl: agencySlug || 'default',
    };

    logApogee.info('Données extraites et mises en cache (TTL: 5min):', {
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

  // Filtrer par date (any[] car les structures API varient)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static filterByDateRange(items: any[], filters: GlobalFilters, dateField: string = 'date'): any[] {
    if (!items || items.length === 0) {
      logApogee.debug(`Aucun item à filtrer pour le champ ${dateField}`);
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
        logApogee.warn(`Date invalide pour ${dateField}:`, dateValue);
        return false;
      }
    });

    logApogee.debug(`Filtrage par date (${dateField}): ${items.length} → ${filtered.length} items`);
    return filtered;
  }

  // Jointures et agrégations (any car structure API variable)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static getFactureTotalHT(facture: any): number {
    if (!facture) return 0;
    if (typeof facture.totalHT === 'number') return facture.totalHT;
    if (typeof facture.totalHT === 'string') return parseFloat(facture.totalHT) || 0;
    if (facture.data?.totalHT) return parseFloat(facture.data.totalHT) || 0;
    if (facture.data?.totalBrutHT) return parseFloat(facture.data.totalBrutHT) || 0;
    if (Array.isArray(facture.items)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    logApogee.debug(`Calcul CA par technicien: ${factures.length} factures`);
    
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const intervAny = interv as any;
          if (intervAny.userId) techIds.add(intervAny.userId);
          if (interv.usersIds) interv.usersIds.forEach((id: string) => techIds.add(id));
          if (interv.data?.visites) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    logApogee.debug('CA par technicien calculé (basé temps):', caByTechArrondi);
    logApogee.debug(`CA total période: ${Math.round(caTotalPeriode)} €, CA tech total: ${Object.values(caByTechArrondi).reduce((s, c) => s + c, 0)} €`);
    logApogee.debug(`Factures traitées: ${nbFacturesTraitees}/${factures.length}`);
    
    return caByTechArrondi;
  }

  // CA par univers
  static calculateCAByUniverse(filters: GlobalFilters) {
    const factures = this.filterByDateRange(this.cache.factures || [], filters);
    logApogee.debug(`Calcul CA par univers: ${factures.length} factures`);
    
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

    logApogee.debug('CA par univers calculé:', caByUniverse);
    logApogee.debug(`Factures: ${nbFacturesAvecProjet} avec dossier, ${nbFacturesSansProjet} sans dossier`);
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
