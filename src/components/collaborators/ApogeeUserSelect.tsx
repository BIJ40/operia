/**
 * Sélecteur d'utilisateur Apogée pour lier un collaborateur à son ID API
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { useProfile } from '@/contexts/ProfileContext';

interface ApogeeUser {
  id: number;
  firstname: string;
  name: string;
  is_on: boolean;
}

interface ApogeeUserSelectProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  collaboratorName?: string;
  label?: string;
  /** Si fourni, utilise ce slug d'agence au lieu de celui de l'utilisateur connecté */
  agencySlug?: string;
}

export function ApogeeUserSelect({ value, onChange, collaboratorName, label, agencySlug: agencySlugProp }: ApogeeUserSelectProps) {
  const { user, agence } = useAuth();
  const agencySlug = agencySlugProp || agence;

  // Charger les utilisateurs Apogée via proxy
  const { data: apogeeUsers, isLoading, error } = useQuery({
    queryKey: ['apogee-users-for-select', agencySlug],
    queryFn: async () => {
      if (!agencySlug) return [];
      
      const { data, error } = await supabase.functions.invoke('proxy-apogee', {
        body: {
          endpoint: 'apiGetUsers',
          params: {},
          agencySlug,
        },
      });

      if (error) throw error;
      return (data?.data || []) as ApogeeUser[];
    },
    enabled: !!agencySlug && !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Filtrer et trier les techniciens actifs
  const technicians = useMemo(() => {
    if (!apogeeUsers || !Array.isArray(apogeeUsers)) return [];
    
    return apogeeUsers
      .filter(u => u.is_on === true)
      .map(u => ({
        id: u.id,
        label: `${u.firstname || ''} ${u.name || ''}`.trim(),
      }))
      .filter(u => u.label.length > 0)
      .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
  }, [apogeeUsers]);

  // Auto-suggestion basée sur le nom du collaborateur
  const suggestedMatch = useMemo(() => {
    if (!collaboratorName || !technicians.length) return null;
    
    const normalizedName = collaboratorName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    return technicians.find(t => {
      const normalizedLabel = t.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return normalizedLabel.includes(normalizedName) || normalizedName.includes(normalizedLabel);
    });
  }, [collaboratorName, technicians]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 h-10 px-3 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement des techniciens...
      </div>
    );
  }

  if (error || !technicians.length) {
    return (
      <div className="text-sm text-muted-foreground">
        {error ? 'Erreur de chargement' : 'Aucun technicien disponible'}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {label && <label className="text-sm font-medium">{label}</label>}
      <Select
        value={value?.toString() || 'none'}
        onValueChange={(v) => onChange(v === 'none' ? undefined : parseInt(v, 10))}
      >
        <SelectTrigger>
          <SelectValue placeholder="Sélectionner un technicien Apogée" />
        </SelectTrigger>
        <SelectContent className="bg-background z-50 max-h-60">
          <SelectItem value="none">Aucun</SelectItem>
          {technicians.map((tech) => (
            <SelectItem key={tech.id} value={tech.id.toString()}>
              {tech.label} (ID: {tech.id})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {/* Suggestion automatique */}
      {suggestedMatch && !value && (
        <button
          type="button"
          onClick={() => onChange(suggestedMatch.id)}
          className="text-xs text-primary hover:underline"
        >
          💡 Suggestion : {suggestedMatch.label} (ID: {suggestedMatch.id})
        </button>
      )}
    </div>
  );
}
