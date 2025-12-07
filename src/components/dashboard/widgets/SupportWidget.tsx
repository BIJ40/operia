/**
 * Widget Support - Accès rapide au support et tickets
 */

import { HeadphonesIcon, Plus, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function SupportWidget() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <HeadphonesIcon className="h-5 w-5 text-helpconfort-orange" />
        <span className="text-sm font-medium">Support HelpConfort</span>
      </div>
      
      <div className="flex-1 space-y-3">
        <Link
          to="/support/mes-demandes"
          className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors text-sm"
        >
          <span>Mes demandes</span>
          <ExternalLink className="h-3 w-3 text-muted-foreground" />
        </Link>
        
        <Link
          to="/support/faq"
          className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors text-sm"
        >
          <span>FAQ</span>
          <ExternalLink className="h-3 w-3 text-muted-foreground" />
        </Link>
      </div>

      <Button asChild size="sm" className="mt-3 w-full">
        <Link to="/support/nouveau">
          <Plus className="h-4 w-4 mr-1" />
          Nouveau ticket
        </Link>
      </Button>
    </div>
  );
}
