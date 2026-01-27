/**
 * Contenu du drawer RH (dates d'entrée/sortie) pour le Cockpit RH
 * Gère hiring_date et leaving_date avec auto-save
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { DrawerSection, DrawerField } from './RHCockpitDrawer';
import { RHCollaborator } from '@/types/rh-suivi';
import { IndicatorStatus } from '@/hooks/rh/useRHCockpitIndicators';
import { Check, Loader2, Calendar, UserMinus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface RHCockpitDrawerRHProps {
  collaborator: RHCollaborator;
  onUpdate?: () => void;
}

// Format date pour affichage
function formatDateForDisplay(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    return format(parseISO(dateStr), 'dd/MM/yyyy');
  } catch {
    return dateStr;
  }
}

// Convertir DD/MM/YYYY en YYYY-MM-DD
function convertToISODate(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null;
  
  // Déjà en format ISO ?
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Convertir DD/MM/YYYY
  const match = dateStr.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  return null;
}

export function RHCockpitDrawerRH({ collaborator, onUpdate }: RHCockpitDrawerRHProps) {
  const queryClient = useQueryClient();
  
  // État local pour l'édition
  const [hiringDate, setHiringDate] = useState('');
  const [leavingDate, setLeavingDate] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  // Sync avec les props
  useEffect(() => {
    setHiringDate(formatDateForDisplay(collaborator.hiring_date));
    setLeavingDate(formatDateForDisplay(collaborator.leaving_date));
  }, [collaborator.hiring_date, collaborator.leaving_date]);

  // Auto-save
  const saveField = useCallback(async (field: 'hiring_date' | 'leaving_date', value: string) => {
    const isoValue = convertToISODate(value);
    const currentValue = field === 'hiring_date' ? collaborator.hiring_date : collaborator.leaving_date;
    
    if (isoValue === currentValue) {
      return; // Pas de changement
    }

    setSaving(field);
    try {
      const { error } = await supabase
        .from('collaborators')
        .update({ [field]: isoValue })
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
  }, [collaborator.id, collaborator.hiring_date, collaborator.leaving_date, queryClient, onUpdate]);

  // Status helpers
  const hiringStatus: IndicatorStatus = collaborator.hiring_date ? 'ok' : 'warning';
  const isActive = !collaborator.leaving_date;

  return (
    <DrawerSection>
      {/* Badge statut */}
      <div className={cn(
        'flex items-center gap-2 p-3 rounded-lg mb-4',
        isActive ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-slate-100 dark:bg-slate-800/50'
      )}>
        {isActive ? (
          <>
            <Calendar className="h-5 w-5 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              Collaborateur actif
            </span>
          </>
        ) : (
          <>
            <UserMinus className="h-5 w-5 text-slate-500" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Ancien collaborateur
            </span>
          </>
        )}
      </div>

      <DrawerField 
        label="Date d'entrée" 
        icon="📅" 
        status={hiringStatus}
        hint="Date d'arrivée dans l'entreprise (JJ/MM/AAAA)"
      >
        <div className="relative">
          <Input
            type="text"
            value={hiringDate}
            onChange={(e) => setHiringDate(e.target.value)}
            onBlur={() => saveField('hiring_date', hiringDate)}
            placeholder="01/01/2024"
            className={cn(
              'pr-8 transition-all',
              saving === 'hiring_date' && 'border-primary',
              saved === 'hiring_date' && 'border-emerald-500'
            )}
          />
          {saving === 'hiring_date' && (
            <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {saved === 'hiring_date' && (
            <Check className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
          )}
        </div>
      </DrawerField>

      <DrawerField 
        label="Date de sortie" 
        icon="🚪" 
        hint="Laisser vide si le collaborateur est toujours présent"
      >
        <div className="relative">
          <Input
            type="text"
            value={leavingDate}
            onChange={(e) => setLeavingDate(e.target.value)}
            onBlur={() => saveField('leaving_date', leavingDate)}
            placeholder="Non renseignée"
            className={cn(
              'pr-8 transition-all',
              saving === 'leaving_date' && 'border-primary',
              saved === 'leaving_date' && 'border-emerald-500'
            )}
          />
          {saving === 'leaving_date' && (
            <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {saved === 'leaving_date' && (
            <Check className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
          )}
        </div>
      </DrawerField>

      {/* Ancienneté calculée */}
      {collaborator.hiring_date && (
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">Ancienneté :</span>{' '}
            {calculateSeniority(collaborator.hiring_date, collaborator.leaving_date)}
          </p>
        </div>
      )}
    </DrawerSection>
  );
}

// Calcul de l'ancienneté
function calculateSeniority(hiringDate: string, leavingDate: string | null): string {
  try {
    const start = parseISO(hiringDate);
    const end = leavingDate ? parseISO(leavingDate) : new Date();
    
    const years = end.getFullYear() - start.getFullYear();
    const months = end.getMonth() - start.getMonth();
    
    let totalMonths = years * 12 + months;
    if (totalMonths < 0) totalMonths = 0;
    
    const displayYears = Math.floor(totalMonths / 12);
    const displayMonths = totalMonths % 12;
    
    if (displayYears === 0) {
      return `${displayMonths} mois`;
    } else if (displayMonths === 0) {
      return `${displayYears} an${displayYears > 1 ? 's' : ''}`;
    } else {
      return `${displayYears} an${displayYears > 1 ? 's' : ''} et ${displayMonths} mois`;
    }
  } catch {
    return 'Non calculable';
  }
}
