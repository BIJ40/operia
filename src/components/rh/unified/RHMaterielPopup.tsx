/**
 * Popup pour gérer les matériels/équipements d'un collaborateur
 * Supporte 2 catégories: informatique et outils
 */
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Save, Loader2, Package, Monitor, Wrench } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import type { EquipmentCategory, EquipmentEntry } from '@/types/rh-suivi';
import { cn } from '@/lib/utils';

interface Materiel extends EquipmentEntry {
  id: string;
}

interface RHMaterielPopupProps {
  isOpen: boolean;
  onClose: () => void;
  collaboratorId: string;
  collaboratorName: string;
  defaultCategory?: EquipmentCategory;
  onSave?: () => void;
}

const CATEGORY_CONFIG = {
  informatique: {
    label: 'Informatique',
    icon: Monitor,
    color: 'text-blue-600',
    examples: 'Téléphone, Tablette, PC portable...',
  },
  outils: {
    label: 'Outils',
    icon: Wrench,
    color: 'text-orange-600',
    examples: 'Outillage, Caisse à outils...',
  },
};

export function RHMaterielPopup({
  isOpen,
  onClose,
  collaboratorId,
  collaboratorName,
  defaultCategory,
  onSave,
}: RHMaterielPopupProps) {
  const queryClient = useQueryClient();
  const [materiels, setMateriels] = useState<Materiel[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadMateriels();
    }
  }, [isOpen, collaboratorId]);

  const loadMateriels = async () => {
    const { data } = await supabase
      .from('rh_assets')
      .select('autres_equipements')
      .eq('collaborator_id', collaboratorId)
      .single();
    
    if (data?.autres_equipements) {
      const equipements = (data.autres_equipements as unknown as Materiel[]) || [];
      setMateriels(equipements.map((e, i) => ({ 
        ...e, 
        id: e.id || `mat-${i}`,
        categorie: e.categorie || 'informatique', // Default for legacy data
      })));
    } else {
      setMateriels([]);
    }
  };

  const addMateriel = (categorie: EquipmentCategory) => {
    setMateriels(prev => [
      ...prev,
      { id: `new-${Date.now()}`, nom: '', categorie, numero_serie: '', imei: '', notes: '' }
    ]);
  };

  const removeMateriel = (id: string) => {
    setMateriels(prev => prev.filter(m => m.id !== id));
  };

  const updateMateriel = (id: string, field: keyof Materiel, value: string) => {
    setMateriels(prev => prev.map(m => 
      m.id === id ? { ...m, [field]: value } : m
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const toSave = materiels
        .filter(m => m.nom.trim())
        .map(m => ({
          id: m.id.startsWith('new-') ? crypto.randomUUID() : m.id,
          nom: m.nom,
          categorie: m.categorie,
          numero_serie: m.numero_serie || null,
          imei: m.imei || null,
          notes: m.notes || null,
        }));

      const { error } = await supabase
        .from('rh_assets')
        .upsert({
          collaborator_id: collaboratorId,
          autres_equipements: toSave,
        }, { onConflict: 'collaborator_id' });

      if (error) throw error;

      toast.success('Matériels enregistrés');
      queryClient.invalidateQueries({ queryKey: ['rh-collaborators'] });
      queryClient.invalidateQueries({ queryKey: ['rh-collaborator', collaboratorId] });
      onSave?.();
      onClose();
    } catch (err) {
      console.error('Erreur sauvegarde matériels:', err);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const informatiqueItems = materiels.filter(m => m.categorie === 'informatique');
  const outilsItems = materiels.filter(m => m.categorie === 'outils');

  const renderCategory = (categorie: EquipmentCategory, items: Materiel[]) => {
    const config = CATEGORY_CONFIG[categorie];
    const Icon = config.icon;
    
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4", config.color)} />
          <span className="font-medium">{config.label}</span>
          <span className="text-xs text-muted-foreground">({items.length})</span>
        </div>
        
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2 bg-muted/30 rounded">
            Aucun équipement {config.label.toLowerCase()}
          </p>
        ) : (
          items.map((materiel, index) => (
            <div key={materiel.id} className="border rounded-lg p-3 space-y-2 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {config.label} #{index + 1}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeMateriel(materiel.id)}
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <Label className="text-xs">Nom *</Label>
                  <Input
                    value={materiel.nom}
                    onChange={(e) => updateMateriel(materiel.id, 'nom', e.target.value)}
                    placeholder={config.examples}
                    className="h-7 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">N° Série</Label>
                  <Input
                    value={materiel.numero_serie || ''}
                    onChange={(e) => updateMateriel(materiel.id, 'numero_serie', e.target.value)}
                    placeholder="SN12345..."
                    className="h-7 text-sm"
                  />
                </div>
                {categorie === 'informatique' && (
                  <div>
                    <Label className="text-xs">IMEI</Label>
                    <Input
                      value={materiel.imei || ''}
                      onChange={(e) => updateMateriel(materiel.id, 'imei', e.target.value)}
                      placeholder="35xxxxxxxxx"
                      className="h-7 text-sm"
                    />
                  </div>
                )}
                <div className={categorie === 'informatique' ? 'col-span-2' : ''}>
                  <Label className="text-xs">Notes</Label>
                  <Input
                    value={materiel.notes || ''}
                    onChange={(e) => updateMateriel(materiel.id, 'notes', e.target.value)}
                    placeholder="Notes..."
                    className="h-7 text-sm"
                  />
                </div>
              </div>
            </div>
          ))
        )}
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => addMateriel(categorie)}
          className="w-full h-8"
        >
          <Plus className="h-3 w-3 mr-1" />
          Ajouter {config.label.toLowerCase()}
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Matériels - {collaboratorName}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          {renderCategory('informatique', informatiqueItems)}
          {renderCategory('outils', outilsItems)}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Enregistrer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}