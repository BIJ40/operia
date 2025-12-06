/**
 * Hook unifié pour les métriques SAV depuis StatIA
 */

import { useQuery } from "@tanstack/react-query";
import { useAgency } from "@/apogee-connect/contexts/AgencyContext";
import { useSecondaryFilters } from "@/apogee-connect/contexts/SecondaryFiltersContext";
import { getMetricForAgency } from "@/statia/api/getMetricForAgency";
import { getGlobalApogeeDataServices } from "@/statia/adapters/dataServiceAdapter";
import { useSavOverrides } from "@/hooks/use-sav-overrides";
import { supabase } from "@/integrations/supabase/client";
import type { SAVDossier } from "@/apogee-connect/components/sav/SAVDossierList";

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
  const { overridesMap } = useSavOverrides();
  
  const agencySlug = currentAgency?.id;

  // Inclure les overrides dans la queryKey pour rafraîchir quand les coûts changent
  const overridesVersion = overridesMap.size; // Simple version basée sur le nombre d'entrées

  return useQuery({
    queryKey: ["statia-sav-metrics", agencySlug, filters.dateRange, overridesVersion],
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

      // Récupérer les métriques depuis StatIA + les overrides manuels
      const [
        tauxGlobal,
        nbSav,
        tauxUnivers,
        tauxApporteur,
        tauxTypeApporteur,
        caImpacte,
        savOverridesData,
      ] = await Promise.all([
        getMetricForAgency("taux_sav_global", agencySlug, { dateRange }, services),
        getMetricForAgency("nb_sav_global", agencySlug, { dateRange }, services),
        getMetricForAgency("taux_sav_par_univers", agencySlug, { dateRange }, services),
        getMetricForAgency("taux_sav_par_apporteur", agencySlug, { dateRange }, services),
        getMetricForAgency("taux_sav_par_type_apporteur", agencySlug, { dateRange }, services),
        getMetricForAgency("ca_impacte_sav", agencySlug, { dateRange }, services),
        // Récupérer les overrides manuels depuis la base (coûts ET statuts)
        agencyUuid 
          ? supabase
              .from("sav_dossier_overrides")
              .select("project_id, cout_sav_manuel, is_confirmed_sav")
              .eq("agency_id", agencyUuid)
          : Promise.resolve({ data: [] }),
      ]);

      // Construire une map des overrides pour les statistiques
      const overridesForStats = new Map<number, { cout: number | null; isConfirmed: boolean | null }>();
      for (const row of savOverridesData.data || []) {
        overridesForStats.set(row.project_id, {
          cout: row.cout_sav_manuel,
          isConfirmed: row.is_confirmed_sav,
        });
      }

      // Calculer le coût SAV total (exclure les SAV négatifs = is_confirmed_sav === false)
      const coutSavManuel = (savOverridesData.data || []).reduce((sum, row) => {
        // Exclure les dossiers infirmés (SAV négatif)
        if (row.is_confirmed_sav === false) return sum;
        return sum + (row.cout_sav_manuel || 0);
      }, 0);

      // Compter les dossiers SAV valides (exclure les négatifs)
      const nbSavReel = (savOverridesData.data || []).filter(
        row => row.is_confirmed_sav !== false
      ).length || (typeof nbSav.value === "number" ? nbSav.value : 0);

      // Charger les données brutes pour construire la liste des dossiers
      const [projects, clients, interventions, users] = await Promise.all([
        services.getProjects(agencySlug, dateRange),
        services.getClients(agencySlug),
        services.getInterventions(agencySlug, dateRange),
        services.getUsers(agencySlug),
      ]);
      const data = { projects: projects || [], clients: clients || [], interventions: interventions || [], users: users || [] };

      // Construire la liste des dossiers SAV avec détails
      const dossiersSAV = buildDossiersSAV(data, overridesMap);
      
      // Nombre de SAV affichés dans les stats (excluant les négatifs)
      const nbSavPourStats = dossiersSAV.filter(d => {
        const override = overridesMap.get(d.projectId);
        return override?.is_confirmed_sav !== false;
      }).length;

      return {
        tauxSavGlobal: typeof tauxGlobal.value === "number" ? tauxGlobal.value : 0,
        nbSavGlobal: nbSavPourStats, // Utiliser le compte excluant les SAV négatifs
        tauxSavParUnivers: tauxUnivers.breakdown?.details || {},
        tauxSavParApporteur: tauxApporteur.breakdown?.details || {},
        tauxSavParTypeApporteur: tauxTypeApporteur.breakdown?.details || {},
        caSav: typeof caImpacte.value === "number" ? caImpacte.value : 0,
        coutSavEstime: coutSavManuel, // Coût réel depuis les enregistrements manuels (hors SAV négatifs)
        dossiersSAV,
      };
    },
    enabled: isAgencyReady && !!agencySlug,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Construit la liste des dossiers SAV à partir des données chargées
 */
function buildDossiersSAV(
  data: any,
  overridesMap: Map<number, any>
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
    const type2 = (intervention.data?.type2 || intervention.type2 || "").toLowerCase();
    const type = (intervention.data?.type || intervention.type || "").toLowerCase();
    const pictos = intervention.data?.pictosInterv || [];

    if (type2.includes("sav") || type.includes("sav") || pictos.includes("SAV")) {
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
    // Détection SAV
    if (!isSavProject(project)) continue;

    const projectId = project.id;
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
 * Détection SAV robuste
 */
function isSavProject(project: any): boolean {
  const d = project.data || {};

  if (d.isSav === true || d.is_sav === true || d.isSAV === true) return true;
  if (project.isSav === true || project.is_sav === true) return true;

  if (project.parentProjectId || project.parent_project_id || d.parentId || d.parent_id) return true;
  if (project.parentId || project.parent_id) return true;
  if (d.linkedProjectId || d.linkedDossierId || d.dossierId) return true;

  const fieldsToCheck = [
    d.origineDossier,
    d.origine,
    d.typeDossier,
    d.categorie,
    d.type,
    d.sinistre,
    d.nature,
    project.type,
    project.state,
    project.label,
    project.ref,
  ];

  for (const field of fieldsToCheck) {
    if (field && String(field).toLowerCase().includes("sav")) {
      return true;
    }
  }

  const pictos = d.pictosInterv || d.pictos || project.pictosInterv || [];
  if (Array.isArray(pictos) && pictos.some((p: any) => String(p).toLowerCase().includes("sav"))) {
    return true;
  }

  const tags = (d.tags || project.tags || []) as any[];
  if (Array.isArray(tags) && tags.some((t) => String(t).toLowerCase().includes("sav"))) {
    return true;
  }

  return false;
}
