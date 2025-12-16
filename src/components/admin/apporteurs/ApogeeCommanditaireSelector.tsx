/**
 * ApogeeCommanditaireSelector - Recherche et sélection d'un commanditaire Apogée
 */

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Search, Building2, Check } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

interface CommanditaireResult {
  id: number;
  name: string;
  type: string;
}

interface ApogeeCommanditaireSelectorProps {
  currentId?: number | null;
  onSelect: (commanditaire: { id: number; name: string }) => void;
}

const TYPE_LABELS: Record<string, string> = {
  assurance: 'Assurance',
  assureur: 'Assurance',
  agence: 'Agence Immo',
  agence_immo: 'Agence Immo',
  syndic: 'Syndic',
  courtier: 'Courtier',
  bailleur: 'Bailleur',
  gestionnaire: 'Gestionnaire',
  notaire: 'Notaire',
  expert: 'Expert',
  autre: 'Autre',
};

export function ApogeeCommanditaireSelector({
  currentId,
  onSelect,
}: ApogeeCommanditaireSelectorProps) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isLoading, error } = useQuery({
    queryKey: ['apogee-commanditaires', debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) {
        return [];
      }

      const { data, error } = await supabase.functions.invoke('search-apogee-commanditaires', {
        body: { query: debouncedSearch },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return (data?.data || []) as CommanditaireResult[];
    },
    enabled: debouncedSearch.length >= 2,
    staleTime: 30000,
  });

  const handleSelect = useCallback((item: CommanditaireResult) => {
    onSelect({ id: item.id, name: item.name });
  }, [onSelect]);

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom ou ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
          autoFocus
        />
      </div>

      {/* Results */}
      <div className="border rounded-lg bg-muted/30">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive text-sm">
            Erreur lors de la recherche
          </div>
        ) : !debouncedSearch || debouncedSearch.length < 2 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Entrez au moins 2 caractères pour rechercher
          </div>
        ) : !data || data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Aucun commanditaire trouvé
          </div>
        ) : (
          <ScrollArea className="h-64">
            <div className="divide-y">
              {data.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-accent transition-colors text-left"
                >
                  <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{item.name}</div>
                    <div className="text-xs text-muted-foreground">
                      ID: {item.id}
                    </div>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {TYPE_LABELS[item.type.toLowerCase()] || item.type}
                  </Badge>
                  {currentId === item.id && (
                    <Check className="h-4 w-4 text-green-600 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Current selection info */}
      {currentId && (
        <p className="text-xs text-muted-foreground">
          ID actuel raccordé : <strong>{currentId}</strong>
        </p>
      )}
    </div>
  );
}
