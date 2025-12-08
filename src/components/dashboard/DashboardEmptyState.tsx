/**
 * DashboardEmptyState - État vide du dashboard avec guide
 */

import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LayoutGrid, Plus, Sparkles, Lock, AlertCircle, Building2 } from 'lucide-react';
import { useWidgetTemplatesWithEligibility } from '@/hooks/useDashboard';
import { useAuth } from '@/contexts/AuthContext';

const MODULE_LABELS: Record<string, string> = {
  pilotage_agence: 'Pilotage Agence',
  support: 'Support',
  rh: 'Ressources Humaines',
  help_academy: 'Help Academy',
  apogee_tickets: 'Gestion de Projet',
  reseau_franchiseur: 'Réseau Franchiseur',
};

export function DashboardEmptyState() {
  const { data: eligibilityList, isLoading } = useWidgetTemplatesWithEligibility();
  const { globalRole, agence } = useAuth();
  
  const eligibleWidgets = eligibilityList?.filter(e => e.isEligible) ?? [];
  const lockedWidgets = eligibilityList?.filter(e => !e.isEligible) ?? [];
  const hasAgency = !!agence;
  
  // Count reasons for locked widgets
  const lockedByModule = lockedWidgets.filter(w => w.reason === 'module');
  const lockedByRole = lockedWidgets.filter(w => w.reason === 'role');

  // If user has eligible widgets, show normal empty state
  if (eligibleWidgets.length > 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <LayoutGrid className="w-10 h-10 text-primary" />
        </div>
        
        <h2 className="text-2xl font-bold mb-2">Bienvenue sur votre Dashboard</h2>
        <p className="text-muted-foreground max-w-md mb-6">
          Personnalisez votre espace en ajoutant des widgets. Suivez vos KPIs, 
          tickets, alertes et bien plus en un coup d'œil.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button asChild size="lg">
            <Link to="/widgets">
              <Plus className="h-5 w-5 mr-2" />
              Ajouter des widgets
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link to="/widgets">
              <Sparkles className="h-5 w-5 mr-2" />
              Découvrir les widgets
            </Link>
          </Button>
        </div>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
          <FeatureCard 
            icon="📊" 
            title="KPIs en temps réel"
            description="CA, SAV, dossiers..."
          />
          <FeatureCard 
            icon="🎫" 
            title="Suivi tickets"
            description="Support & Apogée"
          />
          <FeatureCard 
            icon="⚠️" 
            title="Alertes"
            description="Maintenance, échéances"
          />
        </div>
      </div>
    );
  }

  // No eligible widgets - show explanation
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mb-6">
        <Lock className="w-10 h-10 text-amber-600" />
      </div>
      
      <h2 className="text-2xl font-bold mb-2">Aucun widget disponible</h2>
      <p className="text-muted-foreground max-w-lg mb-6">
        Vous n'avez actuellement accès à aucun widget. Cela peut être dû à votre niveau d'accès 
        ou aux modules activés sur votre compte.
      </p>

      {/* Reasons */}
      <div className="w-full max-w-md space-y-3 mb-8">
        {!hasAgency && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 text-left">
            <Building2 className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-orange-800 dark:text-orange-200">Aucune agence assignée</p>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                Vous devez être rattaché à une agence pour accéder aux widgets de pilotage.
              </p>
            </div>
          </div>
        )}

        {lockedByModule.length > 0 && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-left">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-blue-800 dark:text-blue-200">Modules non activés</p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {lockedByModule.length} widget(s) nécessitent des modules non activés : 
                {' '}
                {[...new Set(lockedByModule.map(w => MODULE_LABELS[w.missingModule || ''] || w.missingModule))].join(', ')}.
              </p>
            </div>
          </div>
        )}

        {lockedByRole.length > 0 && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-left">
            <Lock className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-purple-800 dark:text-purple-200">Niveau d'accès insuffisant</p>
              <p className="text-sm text-purple-700 dark:text-purple-300">
                {lockedByRole.length} widget(s) nécessitent un niveau d'accès supérieur.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="outline" size="lg" asChild>
          <Link to="/widgets">
            <Sparkles className="h-5 w-5 mr-2" />
            Voir tous les widgets
          </Link>
        </Button>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        Contactez votre administrateur pour activer les modules nécessaires.
      </p>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="p-4 rounded-xl bg-accent/30 border border-border/50 text-center">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="font-medium text-sm">{title}</div>
      <div className="text-xs text-muted-foreground">{description}</div>
    </div>
  );
}
