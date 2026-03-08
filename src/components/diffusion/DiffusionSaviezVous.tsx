import { useProfile } from '@/contexts/ProfileContext';
import { useQuery } from '@tanstack/react-query';
import { DataService } from '@/apogee-connect/services/dataService';
import { calculateMonthlyCA } from '@/apogee-connect/utils/monthlyCalculations';
import { formatEuros } from '@/apogee-connect/utils/formatters';
import { Lightbulb } from 'lucide-react';

interface DiffusionSaviezVousProps {
  currentMonthIndex: number;
  templates: string[];
}

export const DiffusionSaviezVous = ({ currentMonthIndex, templates }: DiffusionSaviezVousProps) => {
  const { agence } = useAuth();

  const { data } = useQuery({
    queryKey: ['diffusion-saviez-vous', agence],
    queryFn: async () => {
      const allData = await DataService.loadAllData(true, false, agence);
      return allData;
    },
    enabled: !!agence,
  });

  if (!data) return null;

  const currentYear = new Date().getFullYear();
  const monthlyCA = calculateMonthlyCA(
    data.factures,
    data.clients,
    data.projects,
    currentYear,
    agence || ''
  );
  
  // Trouver le mois avec le plus de dossiers
  const monthsWithProjects = monthlyCA.map((m, idx) => ({
    month: idx,
    nbDossiers: m.nbFactures,
  }));
  const maxMonth = monthsWithProjects.reduce((prev, current) => 
    current.nbDossiers > prev.nbDossiers ? current : prev
  );
  
  const currentMonthData = monthlyCA[currentMonthIndex];
  const nbProjetsMois = currentMonthData?.nbFactures || 0;
  const caMoyenDossier = nbProjetsMois > 0 ? (currentMonthData?.ca || 0) / nbProjetsMois : 0;

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  // Choisir un template aléatoire
  const template = templates[currentMonthIndex % templates.length];
  
  // Remplacer les variables
  const text = template
    .replace('{moisMax}', monthNames[maxMonth.month])
    .replace('{annee}', currentYear.toString())
    .replace('{nbDossiersMax}', maxMonth.nbDossiers.toString())
    .replace('{moisCourant}', monthNames[currentMonthIndex])
    .replace('{nbProjetsMois}', nbProjetsMois.toString())
    .replace('{caMoyenDossier}', formatEuros(caMoyenDossier));

  return (
    <div className="rounded-xl border border-helpconfort-blue/20 bg-gradient-to-r from-helpconfort-blue/10 via-background to-background p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0 rounded-full bg-helpconfort-blue/10 p-3 border border-helpconfort-blue/20">
          <Lightbulb className="h-6 w-6 text-helpconfort-blue" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground mb-1">Le Saviez-tu ?</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
        </div>
      </div>
    </div>
  );
};
