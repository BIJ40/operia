/**
 * Section Sécurité & EPI - Édition inline avec auto-save
 * UX simplifiée: EPI requis cliquables, badge dynamique
 */

import { useState, useMemo } from 'react';
import { useAutoSaveEpi } from '@/hooks/useAutoSaveCollaborator';
import { InlineEdit } from '@/components/ui/inline-edit';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { HardHat, Plus, X, Wrench, Check, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RHCollaborator, EquipmentEntry } from '@/types/rh-suivi';

interface Props {
  collaborator: RHCollaborator;
}

const EPI_OPTIONS = [
  'Casque',
  'Lunettes de protection',
  'Gants',
  'Chaussures de sécurité',
  'Gilet haute visibilité',
  'Harnais antichute',
  'Masque respiratoire',
  'Bouchons d\'oreilles',
  'Genouillères',
  'Combinaison de travail',
];

type EpiStatus = 'complete' | 'partial' | 'critical' | 'none';

function getEpiStatus(requis: string[], remis: string[]): EpiStatus {
  if (requis.length === 0) return 'none';
  const remisSet = new Set(remis);
  const completedCount = requis.filter(r => remisSet.has(r)).length;
  const percentage = completedCount / requis.length;
  if (percentage === 1) return 'complete';
  if (percentage >= 0.5) return 'partial';
  return 'critical';
}

export function RHSectionSecurite({ collaborator }: Props) {
  const epi = collaborator.epi_profile;
  const assets = collaborator.assets;
  const { saveField } = useAutoSaveEpi(collaborator.id);
  
  const [epiRequisOpen, setEpiRequisOpen] = useState(false);
  const [equipmentOpen, setEquipmentOpen] = useState(false);
  const [newEquipment, setNewEquipment] = useState({ nom: '', numero_serie: '' });
  
  const epiRequis = epi?.epi_requis || [];
  const epiRemis = epi?.epi_remis || [];
  const autresEquipements: EquipmentEntry[] = assets?.autres_equipements || [];

  // Calculate EPI status
  const epiStatus = useMemo(() => getEpiStatus(epiRequis, epiRemis), [epiRequis, epiRemis]);

  const toggleEpiRequis = (item: string) => {
    const updated = epiRequis.includes(item)
      ? epiRequis.filter(e => e !== item)
      : [...epiRequis, item];
    saveField('epi_requis', updated);
    // Also remove from remis if removed from requis
    if (epiRequis.includes(item) && epiRemis.includes(item)) {
      saveField('epi_remis', epiRemis.filter(e => e !== item));
    }
  };

  const toggleEpiRemis = (item: string) => {
    // Can only toggle remis for items in requis
    if (!epiRequis.includes(item)) return;
    const updated = epiRemis.includes(item)
      ? epiRemis.filter(e => e !== item)
      : [...epiRemis, item];
    saveField('epi_remis', updated);
  };

  const addEquipment = () => {
    if (!newEquipment.nom.trim()) return;
    const updated: EquipmentEntry[] = [
      ...autresEquipements,
      { 
        id: crypto.randomUUID(),
        nom: newEquipment.nom,
        categorie: 'outils',
        numero_serie: newEquipment.numero_serie || undefined,
        date_attribution: new Date().toISOString().split('T')[0],
      }
    ];
    saveAssetsField('autres_equipements', updated);
    setNewEquipment({ nom: '', numero_serie: '' });
    setEquipmentOpen(false);
  };

  const removeEquipment = (id: string) => {
    const updated = autresEquipements.filter(e => e.id !== id);
    saveAssetsField('autres_equipements', updated);
  };

  const saveAssetsField = async (field: string, value: any) => {
    const { supabase } = await import('@/integrations/supabase/client');
    await supabase
      .from('rh_assets')
      .upsert({
        collaborator_id: collaborator.id,
        [field]: value,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'collaborator_id' });
  };

  // Status badge configuration - icon color changes based on status, count always visible
  const completedCount = epiRequis.filter(r => epiRemis.includes(r)).length;
  const countLabel = epiRequis.length > 0 ? `${completedCount}/${epiRequis.length}` : '';
  
  const statusConfig: Record<EpiStatus, { icon: React.ReactNode; iconClassName: string; badgeClassName: string }> = {
    complete: {
      icon: <Check className="h-3 w-3" />,
      iconClassName: 'text-green-600 dark:text-green-400',
      badgeClassName: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700',
    },
    partial: {
      icon: <Check className="h-3 w-3" />,
      iconClassName: 'text-amber-600 dark:text-amber-400',
      badgeClassName: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700',
    },
    critical: {
      icon: <Check className="h-3 w-3" />,
      iconClassName: 'text-red-600 dark:text-red-400',
      badgeClassName: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700',
    },
    none: {
      icon: null,
      iconClassName: '',
      badgeClassName: 'bg-muted text-muted-foreground border-border',
    },
  };

  const currentStatus = statusConfig[epiStatus];

  return (
    <div className="space-y-4">
      {/* Header avec statut EPI */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HardHat className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Équipements de protection</span>
        </div>
        <Badge variant="outline" className={cn("gap-1.5 text-xs", currentStatus.badgeClassName)}>
          {currentStatus.icon && (
            <span className={currentStatus.iconClassName}>{currentStatus.icon}</span>
          )}
          {countLabel || 'Non défini'}
        </Badge>
      </div>

      {/* EPI Requis - Liste cliquable */}
      <div className="bg-muted/30 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs text-muted-foreground">EPI requis (cliquer pour marquer remis)</Label>
          <Popover open={epiRequisOpen} onOpenChange={setEpiRequisOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1">
                <Plus className="h-3 w-3" />
                Gérer
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2 bg-background z-50" align="end">
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {EPI_OPTIONS.map(item => (
                  <div key={item} className="flex items-center gap-2 p-1 hover:bg-muted rounded">
                    <Checkbox
                      id={`requis-${item}`}
                      checked={epiRequis.includes(item)}
                      onCheckedChange={() => toggleEpiRequis(item)}
                    />
                    <label htmlFor={`requis-${item}`} className="text-xs cursor-pointer flex-1">
                      {item}
                    </label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {epiRequis.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Aucun EPI requis défini</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {epiRequis.map(item => {
              const isRemis = epiRemis.includes(item);
              return (
                <button
                  key={item}
                  onClick={() => toggleEpiRemis(item)}
                  className={cn(
                    "px-2 py-1 rounded-md text-xs font-medium transition-all border",
                    "hover:scale-105 active:scale-95",
                    isRemis
                      ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-400 dark:border-green-700"
                      : "bg-background text-muted-foreground border-dashed border-muted-foreground/40 hover:border-muted-foreground"
                  )}
                >
                  {isRemis && <Check className="h-3 w-3 inline mr-1" />}
                  {item}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <InlineEdit
          label="Dernière remise"
          value={epi?.date_derniere_remise || ''}
          onSave={(v) => saveField('date_derniere_remise', v)}
          type="date"
        />
        <InlineEdit
          label="Prochain renouvellement"
          value={epi?.date_renouvellement || ''}
          onSave={(v) => saveField('date_renouvellement', v)}
          type="date"
        />
      </div>

      {/* Tailles - ligne compacte */}
      <div className="border-t pt-3">
        <h4 className="text-xs font-medium mb-2 text-muted-foreground">Tailles équipements</h4>
        <div className="grid grid-cols-4 gap-3">
          <InlineEdit
            label="Haut"
            value={epi?.taille_haut || ''}
            onSave={(v) => saveField('taille_haut', v)}
            placeholder="M, L..."
          />
          <InlineEdit
            label="Bas"
            value={epi?.taille_bas || ''}
            onSave={(v) => saveField('taille_bas', v)}
            placeholder="40, 42..."
          />
          <InlineEdit
            label="Pointure"
            value={epi?.pointure || ''}
            onSave={(v) => saveField('pointure', v)}
            placeholder="42..."
          />
          <InlineEdit
            label="Gants"
            value={epi?.taille_gants || ''}
            onSave={(v) => saveField('taille_gants', v)}
            placeholder="8, 9..."
          />
        </div>
      </div>

      {/* Autres équipements */}
      <div className="border-t pt-3">
        <div className="flex items-center gap-2 mb-2">
          <Wrench className="h-4 w-4 text-blue-500" />
          <Label className="text-xs text-muted-foreground">Autres équipements</Label>
          <Popover open={equipmentOpen} onOpenChange={setEquipmentOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                <Plus className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3 bg-background z-50" align="start">
              <div className="space-y-2">
                <Input
                  placeholder="Nom de l'équipement"
                  value={newEquipment.nom}
                  onChange={(e) => setNewEquipment(prev => ({ ...prev, nom: e.target.value }))}
                  className="h-8 text-xs"
                />
                <Input
                  placeholder="N° série (optionnel)"
                  value={newEquipment.numero_serie}
                  onChange={(e) => setNewEquipment(prev => ({ ...prev, numero_serie: e.target.value }))}
                  className="h-8 text-xs"
                />
                <Button size="sm" onClick={addEquipment} className="w-full h-7 text-xs">
                  Ajouter
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex flex-wrap gap-1">
          {autresEquipements.length === 0 ? (
            <span className="text-xs text-muted-foreground">Aucun équipement</span>
          ) : (
            autresEquipements.map(eq => (
              <Badge key={eq.id} variant="outline" className="text-[10px] h-5 gap-1 pr-1">
                {eq.nom}
                {eq.numero_serie && <span className="text-muted-foreground">({eq.numero_serie})</span>}
                <button onClick={() => removeEquipment(eq.id!)} className="hover:text-destructive">
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ))
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="border-t pt-3">
        <h4 className="text-xs font-medium mb-2 text-muted-foreground">Notes sécurité</h4>
        <InlineEdit
          value={epi?.notes_securite || ''}
          onSave={(v) => saveField('notes_securite', v)}
          placeholder="Remarques, besoins spécifiques..."
          type="textarea"
          debounceMs={1200}
        />
      </div>
    </div>
  );
}
