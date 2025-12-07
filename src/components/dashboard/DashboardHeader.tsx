/**
 * DashboardHeader - Header du dashboard avec actions
 */

import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Settings, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export function DashboardHeader() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['user-widgets'] });
  };

  const greeting = getGreeting();
  const firstName = user?.user_metadata?.first_name || 'vous';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold">
          {greeting}, {firstName} 👋
        </h1>
        <p className="text-muted-foreground">
          Votre hub opérationnel personnalisé
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to="/dashboard/widgets">
            <Settings className="h-4 w-4 mr-2" />
            Gérer
          </Link>
        </Button>
        <Button size="sm" asChild>
          <Link to="/dashboard/widgets">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter
          </Link>
        </Button>
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
}
