/**
 * ApogeeCommanditaireSelector - Sélecteur de commanditaire Apogée
 * Permet de lier un apporteur à un commanditaire dans Apogée
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Building2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Commanditaire {
  id: number;
  name: string;
}

interface ApogeeCommanditaireSelectorProps {
  onSelect: (commanditaire: Commanditaire) => void;
}

export function ApogeeCommanditaireSelector({ onSelect }: ApogeeCommanditaireSelectorProps) {
  const { agencyId } = useAuth();
  const [search, setSearch] = useState('');

  const { data: commanditaires, isLoading } = useQuery({
    queryKey: ['apogee-commanditaires', agencyId, search],
    queryFn: async () => {
      if (!agencyId) return [];

      const { data, error } = await supabase.functions.invoke('apogee-proxy', {
        body: {
          endpoint: 'apiGetClients',
          agencyId,
          params: { limit: 50 },
        },
      });

      if (error) throw error;
      
      const clients = data?.data || [];
      
      // Filter commanditaires (type apporteur/prescripteur)
      return clients
        .filter((c: { type?: string; name?: string }) => 
          c.type === 'commanditaire' || c.type === 'apporteur' || c.type === 'prescripteur'
        )
        .filter((c: { name?: string }) =>
          !search || c.name?.toLowerCase().includes(search.toLowerCase())
        )
        .slice(0, 20);
    },
    enabled: !!agencyId,
  });

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un commanditaire..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : commanditaires && commanditaires.length > 0 ? (
        <div className="max-h-48 overflow-y-auto space-y-1">
          {commanditaires.map((cmd: Commanditaire) => (
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
          {search ? 'Aucun résultat' : 'Aucun commanditaire disponible'}
        </p>
      )}
    </div>
  );
}
