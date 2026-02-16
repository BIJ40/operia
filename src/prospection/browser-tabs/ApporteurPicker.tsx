/**
 * Dropdown pour ouvrir un apporteur dans un onglet
 * Recherche live dans Apogée
 */

import React, { useState, useMemo } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Check, Building2, MapPin, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApogeeCommanditaires, type ApogeeCommanditaire } from '@/hooks/useApogeeCommanditaires';
import { Badge } from '@/components/ui/badge';

interface ApporteurPickerProps {
  onSelect: (id: string, name: string) => void;
  isTabOpen: (id: string) => boolean;
}

export function ApporteurPicker({ onSelect, isTabOpen }: ApporteurPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: commanditaires = [], isLoading } = useApogeeCommanditaires();

  const filtered = useMemo(() => {
    if (!search || search.length < 2) return commanditaires.slice(0, 20);
    const q = search.toLowerCase();
    return commanditaires
      .filter(c => c.name.toLowerCase().includes(q) || String(c.id).includes(q) || c.ville?.toLowerCase().includes(q))
      .slice(0, 20);
  }, [commanditaires, search]);

  const handleSelect = (cmd: ApogeeCommanditaire) => {
    onSelect(String(cmd.id), cmd.name);
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
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un apporteur..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-9"
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-[300px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              Chargement...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Aucun apporteur trouvé
            </div>
          ) : (
            <div className="py-1">
              {filtered.map(cmd => {
                const isOpen = isTabOpen(String(cmd.id));
                return (
                  <button
                    key={cmd.id}
                    onClick={() => handleSelect(cmd)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors',
                      'hover:bg-accent hover:text-accent-foreground',
                      isOpen && 'bg-accent/50'
                    )}
                  >
                    <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium truncate block">{cmd.name}</span>
                      {cmd.ville && (
                        <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                          <MapPin className="w-3 h-3" />{cmd.ville}
                        </span>
                      )}
                    </div>
                    {cmd.type && (
                      <Badge variant="secondary" className="text-[10px] shrink-0">{cmd.type}</Badge>
                    )}
                    {isOpen && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
