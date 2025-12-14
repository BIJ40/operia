/**
 * Affiche chaque identifiant comme une sous-colonne avec icône clé
 * Cliquable pour voir/éditer les infos
 */
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Key, Plus, Eye, EyeOff, Trash2, Save, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Identifiant {
  id: string;
  application: string;
  identifiant: string;
  mot_de_passe: string;
  notes?: string;
}

interface RHIdentifiantsDynamicColumnsProps {
  collaboratorId: string;
  collaboratorName: string;
  identifiants: Identifiant[];
  onRefresh: () => void;
}

// Couleurs pour les icônes clé (cycle)
const KEY_COLORS = [
  'text-amber-600',
  'text-blue-600',
  'text-green-600',
  'text-purple-600',
  'text-pink-600',
  'text-cyan-600',
  'text-orange-600',
  'text-indigo-600',
];

function IdentifiantKeyCell({ 
  identifiant, 
  colorIndex,
  collaboratorId,
  onRefresh,
}: { 
  identifiant: Identifiant; 
  colorIndex: number;
  collaboratorId: string;
  onRefresh: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(identifiant);
  const [saving, setSaving] = useState(false);

  const colorClass = KEY_COLORS[colorIndex % KEY_COLORS.length];

  const handleSave = async () => {
    setSaving(true);
    try {
      // Load current identifiants
      const { data } = await supabase
        .from('rh_it_access')
        .select('identifiants_encrypted')
        .eq('collaborator_id', collaboratorId)
        .single();

      let identifiants: Identifiant[] = [];
      if (data?.identifiants_encrypted) {
        try {
          identifiants = JSON.parse(data.identifiants_encrypted);
        } catch {
          identifiants = [];
        }
      }

      // Update the specific identifiant
      const updated = identifiants.map(i => 
        i.id === editData.id ? editData : i
      );

      await supabase
        .from('rh_it_access')
        .upsert({
          collaborator_id: collaboratorId,
          identifiants_encrypted: JSON.stringify(updated),
        }, { onConflict: 'collaborator_id' });

      toast.success('Identifiant mis à jour');
      setIsEditing(false);
      onRefresh();
    } catch (err) {
      console.error('Erreur sauvegarde:', err);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Supprimer l'accès "${identifiant.application}" ?`)) return;
    
    setSaving(true);
    try {
      const { data } = await supabase
        .from('rh_it_access')
        .select('identifiants_encrypted')
        .eq('collaborator_id', collaboratorId)
        .single();

      let identifiants: Identifiant[] = [];
      if (data?.identifiants_encrypted) {
        try {
          identifiants = JSON.parse(data.identifiants_encrypted);
        } catch {
          identifiants = [];
        }
      }

      const filtered = identifiants.filter(i => i.id !== identifiant.id);

      await supabase
        .from('rh_it_access')
        .upsert({
          collaborator_id: collaboratorId,
          identifiants_encrypted: JSON.stringify(filtered),
        }, { onConflict: 'collaborator_id' });

      toast.success('Identifiant supprimé');
      onRefresh();
    } catch (err) {
      console.error('Erreur suppression:', err);
      toast.error('Erreur lors de la suppression');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("h-8 w-8 p-0", colorClass)}
                >
                  <Key className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-3" align="start">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Key className={cn("h-4 w-4", colorClass)} />
                      {identifiant.application}
                    </h4>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          setEditData(identifiant);
                          setIsEditing(true);
                        }}
                      >
                        <Save className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={handleDelete}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Identifiant:</span>
                      <span className="font-mono">{identifiant.identifiant}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Mot de passe:</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono">
                          {showPassword ? identifiant.mot_de_passe : '••••••••'}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>
                    {identifiant.notes && (
                      <div className="pt-2 border-t">
                        <span className="text-muted-foreground text-xs">{identifiant.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <p className="font-medium">{identifiant.application}</p>
            <p className="text-muted-foreground">{identifiant.identifiant}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className={cn("h-5 w-5", colorClass)} />
              Modifier - {identifiant.application}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Application / Service</Label>
              <Input
                value={editData.application}
                onChange={(e) => setEditData({ ...editData, application: e.target.value })}
                placeholder="Apogée, Email..."
              />
            </div>
            <div>
              <Label>Identifiant</Label>
              <Input
                value={editData.identifiant}
                onChange={(e) => setEditData({ ...editData, identifiant: e.target.value })}
              />
            </div>
            <div>
              <Label>Mot de passe</Label>
              <Input
                type="text"
                value={editData.mot_de_passe}
                onChange={(e) => setEditData({ ...editData, mot_de_passe: e.target.value })}
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Input
                value={editData.notes || ''}
                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AddIdentifiantCell({ 
  collaboratorId, 
  onRefresh,
}: { 
  collaboratorId: string;
  onRefresh: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [newData, setNewData] = useState({ application: '', identifiant: '', mot_de_passe: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!newData.application.trim() || !newData.identifiant.trim()) {
      toast.error('Application et identifiant requis');
      return;
    }
    
    setSaving(true);
    try {
      const { data } = await supabase
        .from('rh_it_access')
        .select('identifiants_encrypted')
        .eq('collaborator_id', collaboratorId)
        .single();

      let identifiants: Identifiant[] = [];
      if (data?.identifiants_encrypted) {
        try {
          identifiants = JSON.parse(data.identifiants_encrypted);
        } catch {
          identifiants = [];
        }
      }

      const newIdentifiant: Identifiant = {
        id: crypto.randomUUID(),
        application: newData.application,
        identifiant: newData.identifiant,
        mot_de_passe: newData.mot_de_passe,
        notes: newData.notes || undefined,
      };

      identifiants.push(newIdentifiant);

      await supabase
        .from('rh_it_access')
        .upsert({
          collaborator_id: collaboratorId,
          identifiants_encrypted: JSON.stringify(identifiants),
        }, { onConflict: 'collaborator_id' });

      toast.success(`Accès "${newData.application}" ajouté`);
      setNewData({ application: '', identifiant: '', mot_de_passe: '', notes: '' });
      setIsOpen(false);
      onRefresh();
    } catch (err) {
      console.error('Erreur ajout:', err);
      toast.error('Erreur lors de l\'ajout');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => setIsOpen(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            Ajouter un accès
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Nouvel accès
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Application / Service *</Label>
              <Input
                value={newData.application}
                onChange={(e) => setNewData({ ...newData, application: e.target.value })}
                placeholder="Apogée, Email, CRM..."
              />
            </div>
            <div>
              <Label>Identifiant *</Label>
              <Input
                value={newData.identifiant}
                onChange={(e) => setNewData({ ...newData, identifiant: e.target.value })}
                placeholder="jerome.dupont"
              />
            </div>
            <div>
              <Label>Mot de passe</Label>
              <Input
                type="text"
                value={newData.mot_de_passe}
                onChange={(e) => setNewData({ ...newData, mot_de_passe: e.target.value })}
                placeholder="••••••••"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Input
                value={newData.notes}
                onChange={(e) => setNewData({ ...newData, notes: e.target.value })}
                placeholder="Notes diverses..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Annuler</Button>
            <Button onClick={handleAdd} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function RHIdentifiantsDynamicColumns({
  collaboratorId,
  collaboratorName,
  identifiants,
  onRefresh,
}: RHIdentifiantsDynamicColumnsProps) {
  return (
    <div className="flex items-center gap-1">
      {identifiants.map((identifiant, index) => (
        <IdentifiantKeyCell
          key={identifiant.id}
          identifiant={identifiant}
          colorIndex={index}
          collaboratorId={collaboratorId}
          onRefresh={onRefresh}
        />
      ))}
      <AddIdentifiantCell
        collaboratorId={collaboratorId}
        onRefresh={onRefresh}
      />
    </div>
  );
}
