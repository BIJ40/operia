/**
 * Section Sécurité & EPI - Édition inline avec auto-save
 */

import { useState } from 'react';
import { useAutoSaveEpi } from '@/hooks/useAutoSaveCollaborator';
import { InlineEdit, InlineSelect } from '@/components/ui/inline-edit';
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
import { HardHat, Shield, Plus, X, Wrench } from 'lucide-react';
import type { RHCollaborator, EquipmentEntry } from '@/types/rh-suivi';

interface Props {
  collaborator: RHCollaborator;
}

const STATUT_OPTIONS = [
  { value: 'OK', label: '✓ OK' },
  { value: 'TO_RENEW', label: '⏰ À renouveler' },
  { value: 'MISSING', label: '⚠ Manquant' },
];

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

export function RHSectionSecurite({ collaborator }: Props) {
  const epi = collaborator.epi_profile;
  const assets = collaborator.assets;
  const { saveField } = useAutoSaveEpi(collaborator.id);
  
  const [epiRequisOpen, setEpiRequisOpen] = useState(false);
  const [epiRemisOpen, setEpiRemisOpen] = useState(false);
  const [equipmentOpen, setEquipmentOpen] = useState(false);
  const [newEquipment, setNewEquipment] = useState({ nom: '', numero_serie: '' });
  
  const epiRequis = epi?.epi_requis || [];
  const epiRemis = epi?.epi_remis || [];
  const autresEquipements: EquipmentEntry[] = assets?.autres_equipements || [];

  const toggleEpiRequis = (item: string) => {
    const updated = epiRequis.includes(item)
      ? epiRequis.filter(e => e !== item)
      : [...epiRequis, item];
    saveField('epi_requis', updated);
  };

  const toggleEpiRemis = (item: string) => {
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
    // Save to assets table - need to update via separate hook
    saveAssetsField('autres_equipements', updated);
    setNewEquipment({ nom: '', numero_serie: '' });
    setEquipmentOpen(false);
  };

  const removeEquipment = (id: string) => {
    const updated = autresEquipements.filter(e => e.id !== id);
    saveAssetsField('autres_equipements', updated);
  };

  // Simple inline save for assets
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

  return (
    <div className="space-y-4">
      {/* Statut + Dates - ligne compacte */}
      <div className="grid grid-cols-3 gap-4">
        <InlineSelect
          label="Statut EPI"
          value={epi?.statut_epi || 'OK'}
          options={STATUT_OPTIONS}
          onSave={(v) => saveField('statut_epi', v)}
        />
        <InlineEdit
          label="Dernière remise"
          value={epi?.date_derniere_remise || ''}
          onSave={(v) => saveField('date_derniere_remise', v)}
          type="date"
        />
        <InlineEdit
          label="Renouvellement"
          value={epi?.date_renouvellement || ''}
          onSave={(v) => saveField('date_renouvellement', v)}
          type="date"
        />
      </div>

      {/* EPI Requis & Remis - ligne compacte */}
      <div className="border-t pt-3">
        <div className="flex items-start gap-6">
          {/* EPI Requis */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <HardHat className="h-4 w-4 text-orange-500" />
              <Label className="text-xs text-muted-foreground">EPI requis</Label>
              <Popover open={epiRequisOpen} onOpenChange={setEpiRequisOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                    <Plus className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="start">
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
            <div className="flex flex-wrap gap-1">
              {epiRequis.length === 0 ? (
                <span className="text-xs text-muted-foreground">Aucun</span>
              ) : (
                epiRequis.map(item => (
                  <Badge key={item} variant="outline" className="text-[10px] h-5 gap-1 pr-1">
                    {item}
                    <button onClick={() => toggleEpiRequis(item)} className="hover:text-destructive">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </div>

          {/* EPI Remis */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-green-500" />
              <Label className="text-xs text-muted-foreground">EPI remis</Label>
              <Popover open={epiRemisOpen} onOpenChange={setEpiRemisOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                    <Plus className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="start">
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {EPI_OPTIONS.map(item => (
                      <div key={item} className="flex items-center gap-2 p-1 hover:bg-muted rounded">
                        <Checkbox
                          id={`remis-${item}`}
                          checked={epiRemis.includes(item)}
                          onCheckedChange={() => toggleEpiRemis(item)}
                        />
                        <label htmlFor={`remis-${item}`} className="text-xs cursor-pointer flex-1">
                          {item}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex flex-wrap gap-1">
              {epiRemis.length === 0 ? (
                <span className="text-xs text-muted-foreground">Aucun</span>
              ) : (
                epiRemis.map(item => (
                  <Badge key={item} variant="secondary" className="text-[10px] h-5 gap-1 pr-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    {item}
                    <button onClick={() => toggleEpiRemis(item)} className="hover:text-destructive">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </div>
        </div>
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
            <PopoverContent className="w-64 p-3" align="start">
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
