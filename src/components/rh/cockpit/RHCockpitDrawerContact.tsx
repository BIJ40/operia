/**
 * Contenu du drawer Contact pour le Cockpit RH
 * Gère email et téléphone avec auto-save
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { DrawerSection, DrawerField } from './RHCockpitDrawer';
import { RHCollaborator } from '@/types/rh-suivi';
import { IndicatorStatus } from '@/hooks/rh/useRHCockpitIndicators';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface RHCockpitDrawerContactProps {
  collaborator: RHCollaborator;
  onUpdate?: () => void;
}

export function RHCockpitDrawerContact({ collaborator, onUpdate }: RHCockpitDrawerContactProps) {
  const queryClient = useQueryClient();
  
  // État local pour l'édition
  const [email, setEmail] = useState(collaborator.email || '');
  const [phone, setPhone] = useState(collaborator.phone || '');
  const [saving, setSaving] = useState<'email' | 'phone' | null>(null);
  const [saved, setSaved] = useState<'email' | 'phone' | null>(null);

  // Sync avec les props
  useEffect(() => {
    setEmail(collaborator.email || '');
    setPhone(collaborator.phone || '');
  }, [collaborator.email, collaborator.phone]);

  // Auto-save avec debounce
  const saveField = useCallback(async (field: 'email' | 'phone', value: string) => {
    if (value === (field === 'email' ? collaborator.email : collaborator.phone)) {
      return; // Pas de changement
    }

    setSaving(field);
    try {
      const { error } = await supabase
        .from('collaborators')
        .update({ [field]: value || null })
        .eq('id', collaborator.id);

      if (error) throw error;

      // Feedback visuel
      setSaved(field);
      setTimeout(() => setSaved(null), 2000);

      // Invalider les queries
      queryClient.invalidateQueries({ queryKey: ['rh-collaborators'] });
      queryClient.invalidateQueries({ queryKey: ['rh-collaborator', collaborator.id] });
      
      onUpdate?.();
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(null);
    }
  }, [collaborator.id, collaborator.email, collaborator.phone, queryClient, onUpdate]);

  // Status helpers
  const emailStatus: IndicatorStatus = email ? 'ok' : 'warning';
  const phoneStatus: IndicatorStatus = phone ? 'ok' : 'warning';

  return (
    <DrawerSection>
      <DrawerField 
        label="Email" 
        icon="📧" 
        status={emailStatus}
        hint="Email professionnel ou personnel"
      >
        <div className="relative">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => saveField('email', email)}
            placeholder="email@example.com"
            className={cn(
              'pr-8 transition-all',
              saving === 'email' && 'border-primary',
              saved === 'email' && 'border-emerald-500'
            )}
          />
          {saving === 'email' && (
            <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {saved === 'email' && (
            <Check className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
          )}
        </div>
      </DrawerField>

      <DrawerField 
        label="Téléphone" 
        icon="📱" 
        status={phoneStatus}
        hint="Numéro de téléphone mobile"
      >
        <div className="relative">
          <Input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={() => saveField('phone', phone)}
            placeholder="06 12 34 56 78"
            className={cn(
              'pr-8 transition-all',
              saving === 'phone' && 'border-primary',
              saved === 'phone' && 'border-emerald-500'
            )}
          />
          {saving === 'phone' && (
            <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {saved === 'phone' && (
            <Check className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
          )}
        </div>
      </DrawerField>
    </DrawerSection>
  );
}
