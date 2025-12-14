/**
 * Popup pour gérer les matériels/équipements d'un collaborateur
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
import { Plus, Trash2, Save, Loader2, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Materiel {
  id: string;
  nom: string;
  numero_serie?: string;
  imei?: string;
  notes?: string;
}

interface RHMaterielPopupProps {
  isOpen: boolean;
  onClose: () => void;
  collaboratorId: string;
  collaboratorName: string;
  initialData?: Materiel[];
  onSave?: () => void;
}

export function RHMaterielPopup({
  isOpen,
  onClose,
  collaboratorId,
  collaboratorName,
  initialData = [],
  onSave,
}: RHMaterielPopupProps) {
  const [materiels, setMateriels] = useState<Materiel[]>(initialData);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Charger les matériels existants depuis rh_assets.autres_equipements
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
      setMateriels(equipements.map((e, i) => ({ ...e, id: e.id || `mat-${i}` })));
    } else {
      setMateriels([]);
    }
  };

  const addMateriel = () => {
    setMateriels(prev => [
      ...prev,
      { id: `new-${Date.now()}`, nom: '', numero_serie: '', imei: '', notes: '' }
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
      // Nettoyer les IDs temporaires et préparer pour sauvegarde
      const toSave = materiels
        .filter(m => m.nom.trim())
        .map(m => ({
          id: m.id.startsWith('new-') ? crypto.randomUUID() : m.id,
          nom: m.nom,
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
      onSave?.();
      onClose();
    } catch (err) {
      console.error('Erreur sauvegarde matériels:', err);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
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

        <div className="space-y-4 py-4">
          {materiels.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun matériel enregistré
            </p>
          ) : (
            materiels.map((materiel, index) => (
              <div key={materiel.id} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Équipement #{index + 1}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMateriel(materiel.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label className="text-xs">Nom de l'équipement *</Label>
                    <Input
                      value={materiel.nom}
                      onChange={(e) => updateMateriel(materiel.id, 'nom', e.target.value)}
                      placeholder="Tablette, Téléphone, Outillage..."
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">N° Série</Label>
                    <Input
                      value={materiel.numero_serie || ''}
                      onChange={(e) => updateMateriel(materiel.id, 'numero_serie', e.target.value)}
                      placeholder="SN12345..."
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">IMEI</Label>
                    <Input
                      value={materiel.imei || ''}
                      onChange={(e) => updateMateriel(materiel.id, 'imei', e.target.value)}
                      placeholder="35xxxxxxxxx"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Notes</Label>
                    <Input
                      value={materiel.notes || ''}
                      onChange={(e) => updateMateriel(materiel.id, 'notes', e.target.value)}
                      placeholder="Notes diverses..."
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>
            ))
          )}

          <Button
            variant="outline"
            onClick={addMateriel}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un équipement
          </Button>
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