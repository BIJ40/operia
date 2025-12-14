/**
 * Popup pour gérer les identifiants/mots de passe d'un collaborateur
 * Données sensibles - accessibles N2+ uniquement
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
import { Plus, Trash2, Save, Loader2, Key, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Identifiant {
  id: string;
  application: string;
  identifiant: string;
  mot_de_passe: string;
  notes?: string;
}

interface RHIdentifiantsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  collaboratorId: string;
  collaboratorName: string;
  onSave?: () => void;
}

export function RHIdentifiantsPopup({
  isOpen,
  onClose,
  collaboratorId,
  collaboratorName,
  onSave,
}: RHIdentifiantsPopupProps) {
  const [identifiants, setIdentifiants] = useState<Identifiant[]>([]);
  const [saving, setSaving] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      loadIdentifiants();
    }
  }, [isOpen, collaboratorId]);

  const loadIdentifiants = async () => {
    const { data } = await supabase
      .from('rh_it_access')
      .select('identifiants_encrypted')
      .eq('collaborator_id', collaboratorId)
      .single();
    
    if (data?.identifiants_encrypted) {
      try {
        // Les identifiants sont stockés en JSON (chiffré côté serveur serait idéal)
        const parsed = JSON.parse(data.identifiants_encrypted) as Identifiant[];
        setIdentifiants(parsed.map((e, i) => ({ ...e, id: e.id || `id-${i}` })));
      } catch {
        setIdentifiants([]);
      }
    } else {
      setIdentifiants([]);
    }
  };

  const addIdentifiant = () => {
    setIdentifiants(prev => [
      ...prev,
      { id: `new-${Date.now()}`, application: '', identifiant: '', mot_de_passe: '', notes: '' }
    ]);
  };

  const removeIdentifiant = (id: string) => {
    setIdentifiants(prev => prev.filter(i => i.id !== id));
    setVisiblePasswords(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const updateIdentifiant = (id: string, field: keyof Identifiant, value: string) => {
    setIdentifiants(prev => prev.map(i => 
      i.id === id ? { ...i, [field]: value } : i
    ));
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const toSave = identifiants
        .filter(i => i.application.trim() && i.identifiant.trim())
        .map(i => ({
          id: i.id.startsWith('new-') ? crypto.randomUUID() : i.id,
          application: i.application,
          identifiant: i.identifiant,
          mot_de_passe: i.mot_de_passe,
          notes: i.notes || null,
        }));

      const { error } = await supabase
        .from('rh_it_access')
        .upsert({
          collaborator_id: collaboratorId,
          identifiants_encrypted: JSON.stringify(toSave),
        }, { onConflict: 'collaborator_id' });

      if (error) throw error;

      toast.success('Identifiants enregistrés');
      onSave?.();
      onClose();
    } catch (err) {
      console.error('Erreur sauvegarde identifiants:', err);
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
            <Key className="h-5 w-5" />
            Identifiants & Mots de passe - {collaboratorName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {identifiants.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun identifiant enregistré
            </p>
          ) : (
            identifiants.map((item, index) => (
              <div key={item.id} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Accès #{index + 1}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeIdentifiant(item.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label className="text-xs">Application / Service *</Label>
                    <Input
                      value={item.application}
                      onChange={(e) => updateIdentifiant(item.id, 'application', e.target.value)}
                      placeholder="Apogée, Email, CRM..."
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Identifiant *</Label>
                    <Input
                      value={item.identifiant}
                      onChange={(e) => updateIdentifiant(item.id, 'identifiant', e.target.value)}
                      placeholder="jerome.dupont"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Mot de passe</Label>
                    <div className="relative">
                      <Input
                        type={visiblePasswords.has(item.id) ? 'text' : 'password'}
                        value={item.mot_de_passe}
                        onChange={(e) => updateIdentifiant(item.id, 'mot_de_passe', e.target.value)}
                        placeholder="••••••••"
                        className="h-8 text-sm pr-8"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-8 w-8 p-0"
                        onClick={() => togglePasswordVisibility(item.id)}
                      >
                        {visiblePasswords.has(item.id) ? (
                          <EyeOff className="h-3 w-3" />
                        ) : (
                          <Eye className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Notes</Label>
                    <Input
                      value={item.notes || ''}
                      onChange={(e) => updateIdentifiant(item.id, 'notes', e.target.value)}
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
            onClick={addIdentifiant}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un accès
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