/**
 * Hook unifié pour les métriques SAV depuis StatIA
 * 
 * IMPORTANT: Le tableau de gestion SAV est la SOURCE DE VÉRITÉ.
 * Toutes les métriques sont calculées en respectant les overrides.
 */

import { useQuery } from "@tanstack/react-query";
import { useAgency } from "@/apogee-connect/contexts/AgencyContext";
import { useSecondaryFilters } from "@/apogee-connect/contexts/SecondaryFiltersContext";
import { getMetricForAgency } from "@/statia/api/getMetricForAgency";
import { getGlobalApogeeDataServices } from "@/statia/adapters/dataServiceAdapter";
import { supabase } from "@/integrations/supabase/client";
import type { SAVDossier } from "@/apogee-connect/components/sav/SAVDossierList";
import { 
  loadSAVOverridesByAgencyUuid, 
  isProjectConfirmedSAV,
  type SAVOverridesData 
} from "@/statia/services/savOverridesService";

interface SAVMetrics {
  tauxSavGlobal: number;
  nbSavGlobal: number;
  tauxSavParUnivers: Record<string, { total: number; sav: number; taux: number }>;
  tauxSavParApporteur: Record<string, { total: number; sav: number; taux: number }>;
  tauxSavParTypeApporteur: Record<string, { total: number; sav: number; taux: number }>;
  caSav: number;
  coutSavEstime: number;
  dossiersSAV: SAVDossier[];
}

export function useStatiaSAVMetrics() {
  const { currentAgency, isAgencyReady } = useAgency();
  const { filters } = useSecondaryFilters();
  
  const agencySlug = currentAgency?.id;

  // NE PAS inclure overrides dans queryKey - le filtrage est fait côté composant
  // via useSavOverrides() qui gère l'état optimiste localement
  return useQuery({
    queryKey: ["statia-sav-metrics", agencySlug, filters.dateRange],
    queryFn: async (): Promise<SAVMetrics> => {
      if (!agencySlug) throw new Error("Agency not available");

      const dateRange = {
        start: filters.dateRange?.start || new Date(new Date().getFullYear(), 0, 1),
        end: filters.dateRange?.end || new Date(),
      };

      // Récupérer les services Apogée
      const services = getGlobalApogeeDataServices();

      // Récupérer l'UUID de l'agence pour les overrides
      const { data: agencyData } = await supabase
        .from("apogee_agencies")
        .select("id")
        .eq("slug", agencySlug)
        .single();
      
      const agencyUuid = agencyData?.id;

      // Charger les overrides centralisés (source de vérité)
      const overridesData = agencyUuid 
        ? await loadSAVOverridesByAgencyUuid(agencyUuid)
        : {
            overrides: [],
            overridesMap: new Map(),
            confirmedSavProjectIds: new Set(),
            infirmedProjectIds: new Set(),
            techniciensByProject: new Map(),
            coutsByProject: new Map(),
          } as SAVOverridesData;

      // Construire la map des overrides pour les métriques StatIA
      const savOverridesMap = new Map<number, { is_confirmed_sav: boolean | null; cout_sav_manuel: number | null; techniciens_override: number[] | null }>();
      for (const o of overridesData.overrides) {
        savOverridesMap.set(o.project_id, {
          is_confirmed_sav: o.is_confirmed_sav,
          cout_sav_manuel: o.cout_sav_manuel,
          techniciens_override: o.techniciens_override,
        });
      }

      // Récupérer les métriques depuis StatIA (qui utilisent les overrides)
      const metricsParams = { dateRange, savOverrides: savOverridesMap };
      
      const [
        tauxGlobal,
        nbSav,
        tauxUnivers,
        tauxApporteur,
        tauxTypeApporteur,
        caImpacte,
        coutSav,
      ] = await Promise.all([
        getMetricForAgency("taux_sav_global", agencySlug, metricsParams, services),
        getMetricForAgency("nb_sav_global", agencySlug, metricsParams, services),
        getMetricForAgency("taux_sav_par_univers", agencySlug, metricsParams, services),
        getMetricForAgency("taux_sav_par_apporteur", agencySlug, metricsParams, services),
        getMetricForAgency("taux_sav_par_type_apporteur", agencySlug, metricsParams, services),
        getMetricForAgency("ca_impacte_sav", agencySlug, metricsParams, services),
        getMetricForAgency("cout_sav_estime", agencySlug, metricsParams, services),
      ]);

      // Charger les données brutes pour construire la liste des dossiers
      const [projects, clients, interventions, users] = await Promise.all([
        services.getProjects(agencySlug, dateRange),
        services.getClients(agencySlug),
        services.getInterventions(agencySlug, dateRange),
        services.getUsers(agencySlug),
      ]);
      const data = { 
        projects: projects || [], 
        clients: clients || [], 
        interventions: interventions || [], 
        users: users || [] 
      };

      // Construire la liste des dossiers SAV avec détails
      const dossiersSAV = buildDossiersSAV(data, overridesData);

      return {
        tauxSavGlobal: typeof tauxGlobal.value === "number" ? tauxGlobal.value : 0,
        nbSavGlobal: typeof nbSav.value === "number" ? nbSav.value : 0,
        tauxSavParUnivers: tauxUnivers.breakdown?.details || {},
        tauxSavParApporteur: tauxApporteur.breakdown?.details || {},
        tauxSavParTypeApporteur: tauxTypeApporteur.breakdown?.details || {},
        caSav: typeof caImpacte.value === "number" ? caImpacte.value : 0,
        coutSavEstime: typeof coutSav.value === "number" ? coutSav.value : 0,
        dossiersSAV,
      };
    },
    enabled: isAgencyReady && !!agencySlug,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Construit la liste des dossiers SAV à partir des données chargées
 * Respecte les overrides (source de vérité)
 */
function buildDossiersSAV(
  data: any,
  overridesData: SAVOverridesData
): SAVDossier[] {
  const { projects = [], clients = [], interventions = [], users = [] } = data;

  // Index clients par ID pour lookup rapide
  const clientsById = new Map<string, any>();
  for (const c of clients) {
    clientsById.set(String(c.id), c);
  }

  // Index users par ID pour lookup rapide
  const usersById = new Map<number, { id: number; name: string }>();
  for (const u of users) {
    const name = [u.firstname, u.lastname].filter(Boolean).join(" ") || u.name || `Tech ${u.id}`;
    usersById.set(Number(u.id), { id: Number(u.id), name });
  }

  // Collecter interventions SAV par projet avec techniciens
  const savDataByProject = new Map<string, { count: number; techniciens: Set<number> }>();
  
  for (const intervention of interventions) {
    const type2 = (intervention.data?.type2 || intervention.type2 || "").toLowerCase().trim();
    const type = (intervention.data?.type || intervention.type || "").toLowerCase().trim();
    const pictos = intervention.data?.pictosInterv || [];

    // RÈGLE HARMONISÉE: type/type2 CONTIENT "sav" OU picto === "sav"
    const hasSAVType = type2.includes("sav") || type.includes("sav");
    const hasSAVPicto = Array.isArray(pictos) && pictos.some((p: any) => String(p).toLowerCase().trim() === "sav");
    
    if (hasSAVType || hasSAVPicto) {
      const pid = String(intervention.projectId || intervention.project_id);
      
      if (!savDataByProject.has(pid)) {
        savDataByProject.set(pid, { count: 0, techniciens: new Set() });
      }
      const entry = savDataByProject.get(pid)!;
      entry.count++;
      
      // Extraire les techniciens de l'intervention
      const userId = intervention.userId || intervention.user_id;
      if (userId) entry.techniciens.add(Number(userId));
      
      // Techniciens des visites
      const visites = intervention.visites || intervention.data?.visites || [];
      for (const visite of visites) {
        const visitUserId = visite.userId || visite.user_id;
        if (visitUserId) entry.techniciens.add(Number(visitUserId));
        
        const usersIds = visite.usersIds || visite.users_ids || [];
        for (const uid of usersIds) {
          entry.techniciens.add(Number(uid));
        }
      }
    }
  }

  const result: SAVDossier[] = [];

  for (const project of projects) {
    const projectId = Number(project.id);
    
    // Détection SAV automatique (passe les interventions pour détection via RDV)
    const isAutoSav = isSavProjectAutoDetect(project, interventions);
    
    // Vérifier s'il y a un override pour ce projet
    const hasOverride = overridesData.overridesMap.has(projectId);
    const override = overridesData.overridesMap.get(projectId);
    
    // RÈGLE: On inclut dans la liste si:
    // 1. Projet auto-détecté SAV ET pas d'override infirmant
    // 2. OU projet avec override (qu'il soit confirmé OU infirmé - pour affichage dans "Traités")
    const isConfirmedSav = isProjectConfirmedSAV(projectId, isAutoSav, overridesData);
    const isInfirmedSav = hasOverride && override?.is_confirmed_sav === false;
    
    // Ne pas inclure si: pas auto-détecté ET pas d'override
    if (!isAutoSav && !hasOverride) {
      continue;
    }
    
    // Ne pas inclure si: auto-détecté mais infirmé (sauf si on veut le montrer dans "Traités")
    // On les inclut maintenant pour qu'ils apparaissent dans "SAV traités" avec statut "Négatif"
    if (!isConfirmedSav && !isInfirmedSav) {
      continue;
    }

    const d = project.data || {};

    // Extraction données
    const universes: string[] = Array.isArray(d.universes)
      ? d.universes
      : d.univers
      ? [d.univers]
      : ["Non défini"];

    const cmdId = d.commanditaireId || project.commanditaireId;
    const client = cmdId ? clientsById.get(String(cmdId)) : null;
    const apporteurNom = client?.displayName || client?.raisonSociale || client?.nom || "Client direct";
    const apporteurType = client?.data?.type || client?.data?.typeApporteur || "";

    const clientFinal = clientsById.get(String(project.clientId));
    const clientName = clientFinal?.displayName || clientFinal?.nom || clientFinal?.name || "Inconnu";

    const dateSAV =
      project.dateReelle ||
      project.date ||
      d.dateReelle ||
      d.date ||
      project.created_at ||
      "";

    const savData = savDataByProject.get(String(projectId));
    const nbInterventionsSAV = savData?.count || 0;
    
    // Construire la liste des techniciens auto-détectés
    const techniciensAuto: Array<{ id: number; name: string }> = [];
    if (savData) {
      for (const techId of savData.techniciens) {
        const user = usersById.get(techId);
        if (user) {
          techniciensAuto.push(user);
        }
      }
    }

    const caSAVAuto = 0;

    result.push({
      projectId,
      projectRef: project.ref || String(projectId),
      projectLabel: project.label || d.label || "",
      clientName,
      universes,
      apporteurNom,
      apporteurType,
      nbInterventionsSAV,
      caSAVAuto,
      dateSAV: typeof dateSAV === "string" ? dateSAV.split("T")[0] : "",
      techniciensAuto,
    });
  }

  // Tri par date décroissante
  result.sort((a, b) => b.dateSAV.localeCompare(a.dateSAV));

  return result;
}

/**
 * Détection SAV automatique (avant application des overrides)
 * RÈGLE MÉTIER STRICTE:
 * - Dossier avec intervention type2 === "SAV" (égalité exacte)
 * - OU dossier avec picto SAV
 * NE PAS utiliser .includes() pour éviter les faux positifs (ex: "savoir" contient "sav")
 */
function isSavProjectAutoDetect(project: any, interventions?: any[]): boolean {
  const d = project.data || {};
  const projectId = String(project.id);

  // 1. Vérifier si le projet a des interventions avec type2 === "SAV"
  if (interventions && interventions.length > 0) {
    const hasSAVIntervention = interventions.some(interv => {
      const intervProjectId = String(interv.projectId || interv.project_id);
      if (intervProjectId !== projectId) return false;
      
      // Règle stricte: type2 === "sav" (égalité exacte)
      const type2 = (interv.data?.type2 || interv.type2 || '').toLowerCase().trim();
      if (type2 === 'sav') return true;
      
      // Ou picto SAV présent
      const pictos = interv.data?.pictosInterv || [];
      if (Array.isArray(pictos) && pictos.some((p: any) => String(p).toLowerCase().trim() === 'sav')) {
        return true;
      }
      
      return false;
    });
    if (hasSAVIntervention) return true;
  }

  // 2. Pictos du projet === "sav" (égalité stricte)
  const pictos = d.pictosInterv || d.pictos || project.pictosInterv || [];
  if (Array.isArray(pictos) && pictos.some((p: any) => String(p).toLowerCase().trim() === "sav")) {
    return true;
  }

  return false;
}
