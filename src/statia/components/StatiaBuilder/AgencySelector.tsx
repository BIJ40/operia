/**
 * StatIA Builder - Sélecteur d'agence (mode admin uniquement)
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2 } from 'lucide-react';

interface AgencySelectorProps {
  value: string;
  onChange: (slug: string) => void;
  disabled?: boolean;
}

interface Agency {
  id: string;
  slug: string;
  label: string;
}

export function AgencySelector({ value, onChange, disabled }: AgencySelectorProps) {
  const { data: agencies = [], isLoading } = useQuery({
    queryKey: ['agencies-list-for-statia'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apogee_agencies')
        .select('id, slug, label')
        .eq('is_active', true)
        .order('label');

      if (error) throw error;
      return data as Agency[];
    },
    staleTime: 10 * 60 * 1000,
  });

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select value={value} onValueChange={onChange} disabled={disabled || isLoading}>
        <SelectTrigger className="w-[200px] bg-background">
          <SelectValue placeholder="Sélectionner une agence" />
        </SelectTrigger>
        <SelectContent className="bg-background z-50">
          {agencies.map((agency) => (
            <SelectItem key={agency.id} value={agency.slug}>
              {agency.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
