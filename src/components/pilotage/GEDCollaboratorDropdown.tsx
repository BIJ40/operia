/**
 * Dropdown GED - Liste des collaborateurs pour accès direct à leurs documents
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ChevronDown, User, Loader2 } from 'lucide-react';
import { useCollaborators } from '@/hooks/useCollaborators';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export function GEDCollaboratorDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { collaborators, isLoading } = useCollaborators();

  // Filtrer uniquement les collaborateurs actifs
  const activeCollaborators = collaborators.filter(c => !c.leaving_date);

  const handleCollaboratorClick = (collaboratorId: string) => {
    navigate(`/rh/suivi?open=${collaboratorId}&tab=documents`);
    setIsOpen(false);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div
          className={cn(
            "group relative overflow-hidden rounded-xl p-5 cursor-pointer",
            "border border-border/50 hover:border-helpconfort-blue/30",
            "bg-gradient-to-br from-helpconfort-blue/5 via-background to-background",
            "hover:from-helpconfort-blue/10 hover:via-background hover:to-background",
            "hover:shadow-lg hover:shadow-helpconfort-blue/5",
            "transition-all duration-300",
            "border-l-4 border-l-helpconfort-blue"
          )}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className={cn(
                "p-3 rounded-xl",
                "bg-helpconfort-blue/10",
                "group-hover:bg-helpconfort-blue/20",
                "transition-colors duration-300"
              )}>
                <FileText className="h-6 w-6 text-helpconfort-blue" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground group-hover:text-helpconfort-blue transition-colors">
                  G.E.D
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Dépôt et gestion des documents collaborateurs
                </p>
              </div>
            </div>
            <ChevronDown 
              className={cn(
                "h-5 w-5 text-muted-foreground transition-transform duration-200",
                isOpen && "rotate-180"
              )} 
            />
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-2">
        <div className="bg-muted/30 rounded-xl border border-border/50 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : activeCollaborators.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground text-sm">
              Aucun collaborateur actif
            </div>
          ) : (
            <div className="divide-y divide-border/50 max-h-64 overflow-y-auto">
              {activeCollaborators.map((collaborator) => (
                <button
                  key={collaborator.id}
                  onClick={() => handleCollaboratorClick(collaborator.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3",
                    "hover:bg-helpconfort-blue/5 transition-colors",
                    "text-left"
                  )}
                >
                  <div className="p-1.5 rounded-full bg-helpconfort-blue/10">
                    <User className="h-4 w-4 text-helpconfort-blue" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {collaborator.first_name} {collaborator.last_name}
                    </div>
                    {collaborator.role && (
                      <div className="text-xs text-muted-foreground truncate">
                        {collaborator.role}
                      </div>
                    )}
                  </div>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
