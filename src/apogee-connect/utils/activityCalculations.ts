import { parseISO, format, subDays, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { fr } from "date-fns/locale";

export interface DailyActivity {
  date: string;
  dateLabel: string;
  dossiers: number;
}

export const calculateLast7DaysActivity = (
  projects: any[],
  apporteurFilter?: number | null
): DailyActivity[] => {
  console.log("🔍 calculateLast7DaysActivity - Début", {
    nombreProjets: projects?.length || 0,
    apporteurFilter,
    premierProjet: projects?.[0]
  });
  
  if (!projects || projects.length === 0) {
    console.warn("⚠️ Aucun projet reçu");
    return [];
  }
  
  const result: DailyActivity[] = [];
  const today = new Date();
  
  // Générer les 7 derniers jours
  for (let i = 6; i >= 0; i--) {
    const date = subDays(today, i);
    const dateStart = startOfDay(date);
    const dateEnd = endOfDay(date);
    
    // Filtrer les projets pour ce jour
    let filteredProjects = projects.filter(project => {
      const dateCreation = project.created_at || project.date || project.dateCréationDossier;
      if (!dateCreation) {
        console.warn("⚠️ Projet sans date:", project.id);
        return false;
      }
      
      try {
        const projectDate = parseISO(dateCreation);
        const isInInterval = isWithinInterval(projectDate, { start: dateStart, end: dateEnd });
        if (isInInterval) {
          console.log("✅ Projet dans l'intervalle", format(date, "yyyy-MM-dd"), project.id);
        }
        return isInInterval;
      } catch (error) {
        console.error("❌ Erreur parsing date:", dateCreation, error);
        return false;
      }
    });
    
    // Appliquer le filtre apporteur si présent
    if (apporteurFilter) {
      filteredProjects = filteredProjects.filter(
        project => project.data?.commanditaireId === apporteurFilter
      );
    }
    
    result.push({
      date: format(date, "yyyy-MM-dd"),
      dateLabel: format(date, "EEE dd", { locale: fr }),
      dossiers: filteredProjects.length,
    });
  }
  
  console.log("📊 Résultat calculateLast7DaysActivity:", result);
  return result;
};

export const calculateVariationVs30Days = (
  projects: any[],
  apporteurFilter?: number | null
): number => {
  console.log("🔍 calculateVariationVs30Days - Début", {
    nombreProjets: projects?.length || 0,
    apporteurFilter
  });
  
  if (!projects || projects.length === 0) {
    console.warn("⚠️ Aucun projet reçu pour variation");
    return 0;
  }
  
  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);
  
  // Nombre de dossiers aujourd'hui
  let todayProjects = projects.filter(project => {
    const dateCreation = project.created_at || project.date || project.dateCréationDossier;
    if (!dateCreation) return false;
    
    try {
      const projectDate = parseISO(dateCreation);
      return isWithinInterval(projectDate, { start: todayStart, end: todayEnd });
    } catch {
      return false;
    }
  });
  
  if (apporteurFilter) {
    todayProjects = todayProjects.filter(
      project => project.data?.commanditaireId === apporteurFilter
    );
  }
  
  const todayCount = todayProjects.length;
  console.log("📅 Dossiers aujourd'hui:", todayCount);
  
  // Calculer la moyenne des 30 derniers jours (hors aujourd'hui)
  const thirtyDaysAgo = subDays(todayStart, 30);
  
  let last30DaysProjects = projects.filter(project => {
    const dateCreation = project.created_at || project.date;
    if (!dateCreation) return false;
    
    try {
      const projectDate = parseISO(dateCreation);
      return isWithinInterval(projectDate, { start: thirtyDaysAgo, end: subDays(todayStart, 1) });
    } catch {
      return false;
    }
  });
  
  if (apporteurFilter) {
    last30DaysProjects = last30DaysProjects.filter(
      project => project.data?.commanditaireId === apporteurFilter
    );
  }
  
  const moyenne30j = last30DaysProjects.length / 30;
  console.log("📊 Moyenne 30 jours:", moyenne30j, "dossiers/jour");
  
  if (moyenne30j === 0) return todayCount > 0 ? 100 : 0;
  
  const variation = Math.round(((todayCount - moyenne30j) / moyenne30j) * 100);
  console.log("📈 Variation calculée:", variation + "%");
  
  return variation;
};
