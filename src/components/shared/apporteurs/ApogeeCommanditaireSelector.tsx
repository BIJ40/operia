/**
 * ApogeeCommanditaireSelector - Sélecteur de commanditaire Apogée
 * Permet de lier un apporteur à un commanditaire dans Apogée
 * Utilise l'edge function search-apogee-commanditaires
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Building2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Commanditaire {
  id: number;
  name: string;
  type?: string;
}

interface ApogeeCommanditaireSelectorProps {
  onSelect: (commanditaire: Commanditaire) => void;
}

export function ApogeeCommanditaireSelector({ onSelect }: ApogeeCommanditaireSelectorProps) {
  const [search, setSearch] = useState('');

  const { data: commanditaires, isLoading } = useQuery({
    queryKey: ['search-apogee-commanditaires', search],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];

      const { data, error } = await supabase.functions.invoke('search-apogee-commanditaires', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { query: search },
      });

      if (error) throw error;
      if (!data?.success) return [];

      return (data.data || []) as Commanditaire[];
    },
    enabled: search.trim().length >= 2,
    staleTime: 30_000,
  });

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un commanditaire (min. 2 caractères)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {search.trim().length < 2 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Tapez au moins 2 caractères pour rechercher
        </p>
      ) : isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : commanditaires && commanditaires.length > 0 ? (
        <div className="max-h-48 overflow-y-auto space-y-1">
          {commanditaires.map((cmd) => (
            <Button
              key={cmd.id}
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => onSelect(cmd)}
            >
              <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="truncate">{cmd.name}</span>
              <span className="ml-auto text-xs text-muted-foreground">#{cmd.id}</span>
            </Button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          Aucun résultat
        </p>
      )}
    </div>
  );
}
