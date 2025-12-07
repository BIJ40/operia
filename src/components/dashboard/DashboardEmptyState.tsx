/**
 * DashboardEmptyState - État vide du dashboard avec guide
 */

import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LayoutGrid, Plus, Sparkles } from 'lucide-react';

export function DashboardEmptyState() {
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
          <Link to="/dashboard/widgets">
            <Plus className="h-5 w-5 mr-2" />
            Ajouter des widgets
          </Link>
        </Button>
        <Button variant="outline" size="lg" asChild>
          <Link to="/dashboard/widgets">
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

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="p-4 rounded-xl bg-accent/30 border border-border/50 text-center">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="font-medium text-sm">{title}</div>
      <div className="text-xs text-muted-foreground">{description}</div>
    </div>
  );
}
