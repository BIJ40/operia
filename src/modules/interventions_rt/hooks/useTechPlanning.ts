// Hook pour récupérer le planning du technicien
// Version mockée - sera connectée à l'API plus tard

import { useState, useMemo } from 'react';
import { TechIntervention, RtStatus } from '../types';
import { format, isToday, isTomorrow, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';

// Mock data pour le prototype
const MOCK_INTERVENTIONS: TechIntervention[] = [
  {
    id: 'int-001',
    projectId: 12345,
    clientName: 'M. Dupont Jean',
    clientPhone: '06 12 34 56 78',
    address: '15 rue de la Paix',
    city: 'Paris',
    postalCode: '75002',
    startTime: '08:30',
    endTime: '10:00',
    univers: 'Plomberie',
    type: 'Dépannage',
    dossierRef: 'DOS-2024-12345',
    rtStatus: 'not_started',
  },
  {
    id: 'int-002',
    projectId: 12346,
    clientName: 'Mme Martin Sophie',
    clientPhone: '06 98 76 54 32',
    address: '8 avenue des Champs',
    city: 'Paris',
    postalCode: '75008',
    startTime: '10:30',
    endTime: '12:00',
    univers: 'Plomberie',
    type: 'RT',
    dossierRef: 'DOS-2024-12346',
    rtStatus: 'in_progress',
  },
  {
    id: 'int-003',
    projectId: 12347,
    clientName: 'SCI Les Glycines',
    clientPhone: '01 23 45 67 89',
    address: '22 boulevard Haussmann',
    city: 'Paris',
    postalCode: '75009',
    startTime: '14:00',
    endTime: '16:00',
    univers: 'Plomberie',
    type: 'Travaux',
    dossierRef: 'DOS-2024-12347',
    rtStatus: 'completed',
  },
  {
    id: 'int-004',
    projectId: 12348,
    clientName: 'M. Bernard Pierre',
    clientPhone: '06 55 44 33 22',
    address: '5 rue du Commerce',
    city: 'Paris',
    postalCode: '75015',
    startTime: '16:30',
    endTime: '18:00',
    univers: 'Électricité',
    type: 'Diagnostic',
    dossierRef: 'DOS-2024-12348',
    rtStatus: 'not_started',
  },
];

// Interventions pour demain
const MOCK_TOMORROW: TechIntervention[] = [
  {
    id: 'int-005',
    projectId: 12349,
    clientName: 'Mme Petit Claire',
    clientPhone: '06 11 22 33 44',
    address: '12 rue de Rivoli',
    city: 'Paris',
    postalCode: '75001',
    startTime: '09:00',
    endTime: '11:00',
    univers: 'Serrurerie',
    type: 'Dépannage',
    dossierRef: 'DOS-2024-12349',
    rtStatus: 'not_started',
  },
];

export type DateFilter = 'today' | 'tomorrow' | 'all';

interface UseTechPlanningResult {
  interventions: TechIntervention[];
  isLoading: boolean;
  error: Error | null;
  dateFilter: DateFilter;
  setDateFilter: (filter: DateFilter) => void;
  updateRtStatus: (interventionId: string, status: RtStatus) => void;
  getIntervention: (id: string) => TechIntervention | undefined;
}

export function useTechPlanning(): UseTechPlanningResult {
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [rtStatuses, setRtStatuses] = useState<Record<string, RtStatus>>({});
  const [isLoading] = useState(false);
  const [error] = useState<Error | null>(null);

  const interventions = useMemo(() => {
    let data: TechIntervention[] = [];
    
    switch (dateFilter) {
      case 'today':
        data = MOCK_INTERVENTIONS;
        break;
      case 'tomorrow':
        data = MOCK_TOMORROW;
        break;
      case 'all':
        data = [...MOCK_INTERVENTIONS, ...MOCK_TOMORROW];
        break;
    }

    // Apply RT status updates
    return data.map(int => ({
      ...int,
      rtStatus: rtStatuses[int.id] || int.rtStatus,
    }));
  }, [dateFilter, rtStatuses]);

  const updateRtStatus = (interventionId: string, status: RtStatus) => {
    setRtStatuses(prev => ({ ...prev, [interventionId]: status }));
  };

  const getIntervention = (id: string): TechIntervention | undefined => {
    return [...MOCK_INTERVENTIONS, ...MOCK_TOMORROW].find(int => int.id === id);
  };

  return {
    interventions,
    isLoading,
    error,
    dateFilter,
    setDateFilter,
    updateRtStatus,
    getIntervention,
  };
}

export function getDateLabel(filter: DateFilter): string {
  switch (filter) {
    case 'today':
      return `Aujourd'hui - ${format(new Date(), 'EEEE d MMMM', { locale: fr })}`;
    case 'tomorrow':
      return `Demain - ${format(addDays(new Date(), 1), 'EEEE d MMMM', { locale: fr })}`;
    case 'all':
      return 'Toutes les interventions';
  }
}

export function getRtStatusLabel(status: RtStatus): string {
  switch (status) {
    case 'not_started':
      return 'RT non démarré';
    case 'in_progress':
      return 'RT en cours';
    case 'completed':
      return 'RT terminé';
    case 'pdf_sent':
      return 'PDF envoyé';
  }
}

export function getRtStatusColor(status: RtStatus): string {
  switch (status) {
    case 'not_started':
      return 'bg-muted text-muted-foreground';
    case 'in_progress':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
    case 'completed':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    case 'pdf_sent':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
  }
}

export default useTechPlanning;
