/**
 * Contenu du drawer ICE (contacts d'urgence) pour le Cockpit RH
 * Gère les 2 contacts d'urgence via données sensibles
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { DrawerSection, DrawerField } from './RHCockpitDrawer';
import { RHCollaborator } from '@/types/rh-suivi';
import { IndicatorStatus } from '@/hooks/rh/useRHCockpitIndicators';
import { Check, Loader2, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSensitiveData } from '@/hooks/useSensitiveData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface RHCockpitDrawerICEProps {
  collaborator: RHCollaborator;
  onUpdate?: () => void;
}

export function RHCockpitDrawerICE({ collaborator, onUpdate }: RHCockpitDrawerICEProps) {
  const queryClient = useQueryClient();
  const { sensitiveData, isLoading } = useSensitiveData(collaborator.id);
  
  // État local pour l'édition
  const [contact1, setContact1] = useState('');
  const [phone1, setPhone1] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  // Sync avec les données sensibles
  useEffect(() => {
    if (sensitiveData) {
      setContact1(sensitiveData.emergency_contact || '');
      setPhone1(sensitiveData.emergency_phone || '');
    }
  }, [sensitiveData]);

  // Sauvegarde via Edge Function
  const saveField = useCallback(async (field: 'emergency_contact' | 'emergency_phone', value: string) => {
    const currentValue = field === 'emergency_contact' 
      ? sensitiveData?.emergency_contact 
      : sensitiveData?.emergency_phone;
      
    if (value === currentValue) {
      return; // Pas de changement
    }

    setSaving(field);
    try {
      const { error } = await supabase.functions.invoke('sensitive-data', {
        body: {
          action: 'write',
          collaboratorId: collaborator.id,
          data: { [field]: value || null },
        },
      });

      if (error) throw error;

      // Feedback visuel
      setSaved(field);
      setTimeout(() => setSaved(null), 2000);

      // Invalider les queries
      queryClient.invalidateQueries({ queryKey: ['sensitive-data', collaborator.id] });
      queryClient.invalidateQueries({ queryKey: ['rh-collaborators'] });
      
      onUpdate?.();
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(null);
    }
  }, [collaborator.id, sensitiveData, queryClient, onUpdate]);

  // Status helpers
  const contact1Status: IndicatorStatus = contact1 ? 'ok' : 'warning';
  const phone1Status: IndicatorStatus = phone1 ? 'ok' : 'warning';

  // Comptage ICE
  const iceCount = (contact1 ? 1 : 0) + (phone1 ? 1 : 0);
  const iceComplete = iceCount >= 2;

  if (isLoading) {
    return (
      <DrawerSection>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DrawerSection>
    );
  }

  return (
    <DrawerSection>
      <div className={cn(
        'flex items-center gap-2 p-3 rounded-lg mb-4',
        iceComplete ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-amber-50 dark:bg-amber-950/30'
      )}>
        <Heart className={cn(
          'h-5 w-5',
          iceComplete ? 'text-emerald-600' : 'text-amber-600'
        )} />
        <span className={cn(
          'text-sm font-medium',
          iceComplete ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
        )}>
          {iceComplete 
            ? 'Contact d\'urgence complet' 
            : 'Veuillez renseigner le contact d\'urgence'}
        </span>
      </div>

      <DrawerField 
        label="Nom du contact" 
        icon="👤" 
        status={contact1Status}
        hint="Personne à contacter en cas d'urgence"
      >
        <div className="relative">
          <Input
            type="text"
            value={contact1}
            onChange={(e) => setContact1(e.target.value)}
            onBlur={() => saveField('emergency_contact', contact1)}
            placeholder="Prénom Nom"
            className={cn(
              'pr-8 transition-all',
              saving === 'emergency_contact' && 'border-primary',
              saved === 'emergency_contact' && 'border-emerald-500'
            )}
          />
          {saving === 'emergency_contact' && (
            <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {saved === 'emergency_contact' && (
            <Check className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
          )}
        </div>
      </DrawerField>

      <DrawerField 
        label="Téléphone du contact" 
        icon="📞" 
        status={phone1Status}
        hint="Numéro du contact d'urgence"
      >
        <div className="relative">
          <Input
            type="tel"
            value={phone1}
            onChange={(e) => setPhone1(e.target.value)}
            onBlur={() => saveField('emergency_phone', phone1)}
            placeholder="06 12 34 56 78"
            className={cn(
              'pr-8 transition-all',
              saving === 'emergency_phone' && 'border-primary',
              saved === 'emergency_phone' && 'border-emerald-500'
            )}
          />
          {saving === 'emergency_phone' && (
            <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {saved === 'emergency_phone' && (
            <Check className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
          )}
        </div>
      </DrawerField>
    </DrawerSection>
  );
}
