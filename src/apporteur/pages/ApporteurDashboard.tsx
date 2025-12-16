/**
 * ApporteurDashboard - Tableau de pilotage complet pour l'apporteur
 */

import { useApporteurAuth } from '@/contexts/ApporteurAuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';
import { ApporteurDossiersTable } from '../components/ApporteurDossiersTable';
import { ApporteurPlanningCard } from '../components/ApporteurPlanningCard';

export default function ApporteurDashboard() {
  const { apporteurUser } = useApporteurAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Bienvenue, {apporteurUser?.firstName || 'Partenaire'}
          </h1>
          <p className="text-muted-foreground">
            {apporteurUser?.apporteurName} - Tableau de bord
          </p>
        </div>
        <Button onClick={() => navigate('/apporteur/nouvelle-demande')} className="gap-2">
          <PlusCircle className="w-4 h-4" />
          Nouvelle demande
        </Button>
      </div>

      {/* Planning Card */}
      <ApporteurPlanningCard />

      {/* Dossiers Table */}
      <ApporteurDossiersTable />
    </div>
  );
}
