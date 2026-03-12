/**
 * Widget KPIs pour assistante - Affiche les statistiques personnelles
 */

import { usePersonalKpis } from '@/hooks/usePersonalKpis';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Receipt, FolderPlus, Calendar, Users, FolderOpen, AlertCircle } from 'lucide-react';

const ASSISTANTE_KPIS = [
  { 
    key: 'devisCrees', 
    label: 'Devis créés', 
    icon: FileText,
    format: 'number',
    color: 'from-blue-500 to-blue-600'
  },
  { 
    key: 'facturesCrees', 
    label: 'Factures créées', 
    icon: Receipt,
    format: 'number',
    color: 'from-green-500 to-green-600'
  },
  { 
    key: 'dossiersCrees', 
    label: 'Dossiers créés', 
    icon: FolderPlus,
    format: 'number',
    color: 'from-purple-500 to-purple-600'
  },
  { 
    key: 'rdvPlanifies', 
    label: 'RDV planifiés', 
    icon: Calendar,
    format: 'number',
    color: 'from-orange-500 to-orange-600'
  },
  { 
    key: 'dossiersEnCours', 
    label: 'Dossiers en cours', 
    icon: FolderOpen,
    format: 'number',
    color: 'from-cyan-500 to-cyan-600'
  },
  { 
    key: 'clientsContactes', 
    label: 'Clients contactés', 
    icon: Users,
    format: 'number',
    color: 'from-pink-500 to-pink-600'
  },
];

function formatValue(value: number | undefined): string {
  if (value === undefined || value === null) return '–';
  return value.toLocaleString('fr-FR');
}

export function AssistanteKpisWidget() {
  const { data, isLoading, error } = usePersonalKpis();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2">
        {ASSISTANTE_KPIS.map((kpi) => (
          <Skeleton key={kpi.key} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60px] text-muted-foreground text-sm">
        Erreur de chargement
      </div>
    );
  }

  if (data.type === 'not_linked') {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[100px] text-muted-foreground text-sm gap-2 p-4">
        <AlertCircle className="h-8 w-8 text-amber-500" />
        <p className="text-center">Votre compte n'est pas encore lié à Apogée.</p>
        <p className="text-xs text-center">Contactez votre responsable pour activer vos statistiques.</p>
      </div>
    );
  }

  if (data.type !== 'assistante') {
    return (
      <div className="flex items-center justify-center h-full min-h-[60px] text-muted-foreground text-sm">
        Ce widget est réservé aux assistantes
      </div>
    );
  }

  const kpis = data.data;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2">
      {ASSISTANTE_KPIS.map((kpi) => {
        const Icon = kpi.icon;
        const value = kpis[kpi.key as keyof typeof kpis];
        
        return (
          <Card key={kpi.key} className="p-3 border hover:border-primary/50 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className={`${kpi.color} p-1.5 rounded text-white`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <span className="text-[11px] text-muted-foreground truncate">{kpi.label}</span>
            </div>
            <p className="text-lg font-bold">{formatValue(value)}</p>
          </Card>
        );
      })}
    </div>
  );
}
