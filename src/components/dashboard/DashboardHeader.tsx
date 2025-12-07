/**
 * DashboardHeader - Header du dashboard avec actions
 */

import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Pencil, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardHeaderProps {
  isEditMode: boolean;
  onToggleEditMode: () => void;
}

export function DashboardHeader({ isEditMode, onToggleEditMode }: DashboardHeaderProps) {
  const { user } = useAuth();

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
        <Button 
          variant={isEditMode ? "default" : "outline"} 
          size="sm" 
          onClick={onToggleEditMode}
          className={cn(
            isEditMode && "bg-helpconfort-blue hover:bg-helpconfort-blue/90"
          )}
        >
          {isEditMode ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Terminer
            </>
          ) : (
            <>
              <Pencil className="h-4 w-4 mr-2" />
              Modifier
            </>
          )}
        </Button>
        {isEditMode && (
          <Button size="sm" asChild>
            <Link to="/widgets">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Link>
          </Button>
        )}
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
