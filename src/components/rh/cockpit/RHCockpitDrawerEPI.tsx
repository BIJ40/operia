/**
 * Contenu du drawer EPI & Tailles pour le Cockpit RH
 * Fusion des popups existantes RHEpiPopup + RHTaillesPopup
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DrawerSection, DrawerField } from './RHCockpitDrawer';
import { RHCollaborator } from '@/types/rh-suivi';
import { IndicatorStatus } from '@/hooks/rh/useRHCockpitIndicators';
import { Check, Loader2, HardHat, Ruler } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface RHCockpitDrawerEPIProps {
  collaborator: RHCollaborator;
  onUpdate?: () => void;
}

// Options de tailles
const TAILLES_HAUT = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
const TAILLES_BAS = ['36', '38', '40', '42', '44', '46', '48', '50', '52'];
const POINTURES = ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47'];
const TAILLES_GANTS = ['6', '7', '8', '9', '10', '11', '12'];

export function RHCockpitDrawerEPI({ collaborator, onUpdate }: RHCockpitDrawerEPIProps) {
  const queryClient = useQueryClient();
  const epiProfile = collaborator.epi_profile;
  
  // État local pour l'édition
  const [tailleHaut, setTailleHaut] = useState(epiProfile?.taille_haut || '');
  const [tailleBas, setTailleBas] = useState(epiProfile?.taille_bas || '');
  const [pointure, setPointure] = useState(epiProfile?.pointure || '');
  const [tailleGants, setTailleGants] = useState(epiProfile?.taille_gants || '');
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  // Sync avec les props
  useEffect(() => {
    setTailleHaut(epiProfile?.taille_haut || '');
    setTailleBas(epiProfile?.taille_bas || '');
    setPointure(epiProfile?.pointure || '');
    setTailleGants(epiProfile?.taille_gants || '');
  }, [epiProfile]);

  // Sauvegarde dans rh_epi_profiles (upsert)
  const saveField = useCallback(async (field: string, value: string) => {
    setSaving(field);
    try {
      const { error } = await supabase
        .from('rh_epi_profiles')
        .upsert({
          collaborator_id: collaborator.id,
          [field]: value || null,
        }, {
          onConflict: 'collaborator_id',
        });

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
  }, [collaborator.id, queryClient, onUpdate]);

  // Status helpers
  const tailleHautStatus: IndicatorStatus = tailleHaut ? 'ok' : 'warning';
  const tailleBasStatus: IndicatorStatus = tailleBas ? 'ok' : 'warning';
  const pointureStatus: IndicatorStatus = pointure ? 'ok' : 'warning';

  // Complétude tailles
  const taillesCount = [tailleHaut, tailleBas, pointure].filter(Boolean).length;
  const taillesComplete = taillesCount === 3;

  // Statut EPI global
  const epiStatus = epiProfile?.statut_epi;

  return (
    <>
      {/* Section Tailles */}
      <DrawerSection title="Mensurations">
        <div className={cn(
          'flex items-center gap-2 p-3 rounded-lg mb-4',
          taillesComplete ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-amber-50 dark:bg-amber-950/30'
        )}>
          <Ruler className={cn(
            'h-5 w-5',
            taillesComplete ? 'text-emerald-600' : 'text-amber-600'
          )} />
          <span className={cn(
            'text-sm font-medium',
            taillesComplete ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
          )}>
            {taillesComplete 
              ? 'Toutes les tailles sont renseignées' 
              : `${3 - taillesCount} taille(s) manquante(s)`}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <DrawerField label="Haut" icon="👕" status={tailleHautStatus}>
            <div className="relative">
              <Select
                value={tailleHaut}
                onValueChange={(value) => {
                  setTailleHaut(value);
                  saveField('taille_haut', value);
                }}
              >
                <SelectTrigger className={cn(
                  saved === 'taille_haut' && 'border-emerald-500'
                )}>
                  <SelectValue placeholder="Taille" />
                </SelectTrigger>
                <SelectContent>
                  {TAILLES_HAUT.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {saving === 'taille_haut' && (
                <Loader2 className="absolute right-8 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </DrawerField>

          <DrawerField label="Bas" icon="👖" status={tailleBasStatus}>
            <div className="relative">
              <Select
                value={tailleBas}
                onValueChange={(value) => {
                  setTailleBas(value);
                  saveField('taille_bas', value);
                }}
              >
                <SelectTrigger className={cn(
                  saved === 'taille_bas' && 'border-emerald-500'
                )}>
                  <SelectValue placeholder="Taille" />
                </SelectTrigger>
                <SelectContent>
                  {TAILLES_BAS.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {saving === 'taille_bas' && (
                <Loader2 className="absolute right-8 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </DrawerField>

          <DrawerField label="Pointure" icon="👟" status={pointureStatus}>
            <div className="relative">
              <Select
                value={pointure}
                onValueChange={(value) => {
                  setPointure(value);
                  saveField('pointure', value);
                }}
              >
                <SelectTrigger className={cn(
                  saved === 'pointure' && 'border-emerald-500'
                )}>
                  <SelectValue placeholder="Pointure" />
                </SelectTrigger>
                <SelectContent>
                  {POINTURES.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {saving === 'pointure' && (
                <Loader2 className="absolute right-8 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </DrawerField>

          <DrawerField label="Gants" icon="🧤">
            <div className="relative">
              <Select
                value={tailleGants}
                onValueChange={(value) => {
                  setTailleGants(value);
                  saveField('taille_gants', value);
                }}
              >
                <SelectTrigger className={cn(
                  saved === 'taille_gants' && 'border-emerald-500'
                )}>
                  <SelectValue placeholder="Taille" />
                </SelectTrigger>
                <SelectContent>
                  {TAILLES_GANTS.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {saving === 'taille_gants' && (
                <Loader2 className="absolute right-8 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </DrawerField>
        </div>
      </DrawerSection>

      {/* Section Statut EPI */}
      <DrawerSection title="Équipements de protection" className="mt-6">
        <div className={cn(
          'flex items-center gap-2 p-3 rounded-lg',
          epiStatus === 'OK' && 'bg-emerald-50 dark:bg-emerald-950/30',
          epiStatus === 'TO_RENEW' && 'bg-amber-50 dark:bg-amber-950/30',
          epiStatus === 'MISSING' && 'bg-rose-50 dark:bg-rose-950/30',
          !epiStatus && 'bg-slate-100 dark:bg-slate-800/50'
        )}>
          <HardHat className={cn(
            'h-5 w-5',
            epiStatus === 'OK' && 'text-emerald-600',
            epiStatus === 'TO_RENEW' && 'text-amber-600',
            epiStatus === 'MISSING' && 'text-rose-600',
            !epiStatus && 'text-slate-500'
          )} />
          <span className={cn(
            'text-sm font-medium',
            epiStatus === 'OK' && 'text-emerald-700 dark:text-emerald-400',
            epiStatus === 'TO_RENEW' && 'text-amber-700 dark:text-amber-400',
            epiStatus === 'MISSING' && 'text-rose-700 dark:text-rose-400',
            !epiStatus && 'text-slate-600 dark:text-slate-400'
          )}>
            {epiStatus === 'OK' && 'EPI à jour'}
            {epiStatus === 'TO_RENEW' && 'EPI à renouveler'}
            {epiStatus === 'MISSING' && 'EPI manquants'}
            {!epiStatus && 'Statut EPI non défini'}
          </span>
        </div>

        {/* Liste des EPI remis */}
        {epiProfile?.epi_remis && epiProfile.epi_remis.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">EPI remis :</p>
            <div className="flex flex-wrap gap-2">
              {epiProfile.epi_remis.map((epi, index) => (
                <span 
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
                >
                  {epi}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Date de renouvellement */}
        {epiProfile?.date_renouvellement && (
          <p className="mt-4 text-sm text-muted-foreground">
            Prochain renouvellement : {epiProfile.date_renouvellement}
          </p>
        )}
      </DrawerSection>
    </>
  );
}
