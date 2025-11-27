import { useAuth } from '@/contexts/AuthContext';
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
      const allData = await DataService.loadAllData(true);
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
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-accent/80 to-primary/80 p-6 shadow-2xl">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAzLTRzMiAyIDIgNHYxYy0xIDItMiA0LTMgNC0xIDAtMi0yLTItNHYtMXptMCAwIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-20" />
      
      <div className="relative z-10 flex items-center gap-4">
        <div className="flex-shrink-0 rounded-full bg-white/20 p-4 backdrop-blur">
          <Lightbulb className="h-10 w-10 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white mb-2">Le Saviez-tu ?</h2>
          <p className="text-lg text-white/90 leading-relaxed">{text}</p>
        </div>
      </div>
    </div>
  );
};
