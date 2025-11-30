import { parseISO, format, subDays, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { fr } from "date-fns/locale";
import { logApogee } from "@/lib/logger";

export interface DailyActivity {
  date: string;
  dateLabel: string;
  dossiers: number;
}

export const calculateLast7DaysActivity = (
  projects: any[],
  apporteurFilter?: number | null
): DailyActivity[] => {
  if (!projects || projects.length === 0) {
    logApogee.warn('Aucun projet reçu pour calcul activité 7 jours');
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
      if (!dateCreation) return false;
      
      try {
        const projectDate = parseISO(dateCreation);
        return isWithinInterval(projectDate, { start: dateStart, end: dateEnd });
      } catch (error) {
        logApogee.error('Erreur parsing date projet', { dateCreation, error });
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
  
  return result;
};

export const calculateVariationVs30Days = (
  projects: any[],
  apporteurFilter?: number | null
): number => {
  if (!projects || projects.length === 0) {
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
  
  if (moyenne30j === 0) return todayCount > 0 ? 100 : 0;
  
  return Math.round(((todayCount - moyenne30j) / moyenne30j) * 100);
};
