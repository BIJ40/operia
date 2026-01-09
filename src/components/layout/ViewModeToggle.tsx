/**
 * Toggle discret pour basculer entre mode mobile (/t) et desktop (/)
 */
import { Link, useLocation } from 'react-router-dom';
import { Monitor, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function ViewModeToggle() {
  const location = useLocation();
  const isOnTechnicianView = location.pathname.startsWith('/t');

  if (isOnTechnicianView) {
    // On est sur /t -> proposer d'aller sur /
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            asChild
          >
            <Link to="/">
              <Monitor className="h-4 w-4" />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Passer en mode bureau</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // On est sur / -> proposer d'aller sur /t
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          asChild
        >
          <Link to="/t">
            <Smartphone className="h-4 w-4" />
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>Passer en mode mobile</p>
      </TooltipContent>
    </Tooltip>
  );
}
