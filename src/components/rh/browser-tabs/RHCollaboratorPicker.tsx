/**
 * Dropdown pour ouvrir un collaborateur dans un onglet
 */

import React, { useState, useMemo } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Check, Wrench, User, Briefcase, UserCog } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RHCollaborator } from '@/types/rh-suivi';
import type { CollaboratorType } from '@/types/collaborator';
import type { LucideIcon } from 'lucide-react';

// Icônes par type de collaborateur
const TYPE_ICONS: Record<CollaboratorType, LucideIcon> = {
  TECHNICIEN: Wrench,
  ADMINISTRATIF: User,
  DIRIGEANT: Briefcase,
  COMMERCIAL: UserCog,
  AUTRE: User,
};

const TYPE_LABELS: Record<CollaboratorType, string> = {
  TECHNICIEN: 'Terrain',
  ADMINISTRATIF: 'Administratif',
  DIRIGEANT: 'Direction',
  COMMERCIAL: 'Commercial',
  AUTRE: 'Autre',
};

interface RHCollaboratorPickerProps {
  collaborators: RHCollaborator[];
  onSelect: (collaborator: RHCollaborator) => void;
  isTabOpen: (collaboratorId: string) => boolean;
}

export function RHCollaboratorPicker({
  collaborators,
  onSelect,
  isTabOpen,
}: RHCollaboratorPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  // Grouper les collaborateurs par type
  const groupedCollaborators = useMemo(() => {
    const filtered = collaborators.filter(c => {
      const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
      return fullName.includes(search.toLowerCase());
    });
    
    const groups: Record<string, RHCollaborator[]> = {};
    
    for (const c of filtered) {
      const type = c.type || 'AUTRE';
      if (!groups[type]) groups[type] = [];
      groups[type].push(c);
    }
    
    // Ordre personnalisé
    const order: CollaboratorType[] = ['TECHNICIEN', 'ADMINISTRATIF', 'DIRIGEANT', 'COMMERCIAL', 'AUTRE'];
    const sortedGroups: Array<{ type: CollaboratorType; items: RHCollaborator[] }> = [];
    
    for (const type of order) {
      if (groups[type]?.length > 0) {
        sortedGroups.push({ type, items: groups[type] });
      }
    }
    
    return sortedGroups;
  }, [collaborators, search]);
  
  const handleSelect = (collaborator: RHCollaborator) => {
    onSelect(collaborator);
    setOpen(false);
    setSearch('');
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 mb-1 text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-4 w-4 mr-1" />
          Ouvrir...
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        {/* Barre de recherche */}
        {collaborators.length > 5 && (
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>
        )}
        
        <div className="max-h-[300px] overflow-y-auto">
          {groupedCollaborators.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Aucun collaborateur trouvé
            </div>
          ) : (
            <div className="py-1">
              {groupedCollaborators.map(({ type, items }) => {
                const Icon = TYPE_ICONS[type];
                return (
                  <div key={type}>
                    <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-1.5 bg-muted/50">
                      <Icon className="h-3.5 w-3.5" />
                      {TYPE_LABELS[type]}
                    </div>
                    {items.map(collaborator => {
                      const isOpen = isTabOpen(collaborator.id);
                      return (
                        <button
                          key={collaborator.id}
                          onClick={() => handleSelect(collaborator)}
                          className={cn(
                            'w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                            'hover:bg-accent hover:text-accent-foreground',
                            isOpen && 'bg-accent/50'
                          )}
                        >
                          <span className="flex-1 truncate">
                            {collaborator.first_name} {collaborator.last_name}
                          </span>
                          {isOpen && (
                            <Check className="h-4 w-4 text-primary shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
