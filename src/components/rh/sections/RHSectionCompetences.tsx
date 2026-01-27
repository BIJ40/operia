/**
 * Section Compétences & Habilitations - Version compacte
 */

import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Save, Zap, Plus, X, Clock, Loader2 } from 'lucide-react';
import { useUpdateCompetencies } from '@/hooks/useRHSuivi';
import { useCompetencesCatalogue, useAddCompetenceCatalogue } from '@/hooks/useRHCompetencesCatalogue';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { RHCollaborator, CACESEntry } from '@/types/rh-suivi';

interface Props {
  collaborator: RHCollaborator;
}

const CACES_TYPES = ['CACES 1', 'CACES 2', 'CACES 3', 'CACES 4', 'CACES 5', 'CACES 6', 'NACELLE'];
const HAB_ELEC_STATUTS = ['B0', 'B1', 'B1V', 'B2', 'B2V', 'BR', 'BC', 'H0', 'H1', 'H1V', 'H2', 'H2V'];

export function RHSectionCompetences({ collaborator }: Props) {
  const comp = collaborator.competencies;
  const updateComp = useUpdateCompetencies();
  const { data: catalogueCompetences = [] } = useCompetencesCatalogue();
  const addCompetence = useAddCompetenceCatalogue();
  
  const [form, setForm] = useState({
    habilitation_electrique_statut: comp?.habilitation_electrique_statut || '',
    habilitation_electrique_date: comp?.habilitation_electrique_date || '',
    caces: (comp?.caces || []) as CACESEntry[],
    competences_techniques: (comp?.competences_techniques || []) as string[],
  });

  const [newCaces, setNewCaces] = useState({ type: '', date: '', expiration: '' });
  const [showAddCompetence, setShowAddCompetence] = useState(false);
  const [newCompetenceLabel, setNewCompetenceLabel] = useState('');

  const handleSave = () => {
    const sanitizedData = {
      ...form,
      habilitation_electrique_date: form.habilitation_electrique_date || null,
      caces: form.caces.map(c => ({
        ...c,
        date: c.date || null,
        expiration: c.expiration || null,
      })),
    };
    
    updateComp.mutate({
      collaboratorId: collaborator.id,
      data: sanitizedData,
    });
  };

  const addCaces = () => {
    if (!newCaces.type || !newCaces.date) return;
    setForm(f => ({
      ...f,
      caces: [...f.caces, newCaces],
    }));
    setNewCaces({ type: '', date: '', expiration: '' });
  };

  const removeCaces = (index: number) => {
    setForm(f => ({
      ...f,
      caces: f.caces.filter((_, i) => i !== index),
    }));
  };

  const toggleCompetence = (label: string) => {
    setForm(f => {
      const has = f.competences_techniques.includes(label);
      return {
        ...f,
        competences_techniques: has
          ? f.competences_techniques.filter(c => c !== label)
          : [...f.competences_techniques, label],
      };
    });
  };

  const handleAddNewCompetence = () => {
    if (!newCompetenceLabel.trim()) return;
    addCompetence.mutate(newCompetenceLabel.trim(), {
      onSuccess: () => {
        setForm(f => ({
          ...f,
          competences_techniques: [...f.competences_techniques, newCompetenceLabel.trim()],
        }));
        setNewCompetenceLabel('');
        setShowAddCompetence(false);
      },
    });
  };

  const allCompetences = React.useMemo(() => {
    const base = catalogueCompetences.map(c => c.label);
    const extras = form.competences_techniques.filter(c => !base.some(b => b.toLowerCase() === c.toLowerCase()));
    return [...base, ...extras];
  }, [catalogueCompetences, form.competences_techniques]);

  return (
    <div className="space-y-6">
      {/* Compétences techniques */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium">Compétences techniques</h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAddCompetence(true)}
            className="h-7 gap-1 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter
          </Button>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 max-h-[180px] overflow-y-auto">
          {allCompetences.map((comp) => (
            <label
              key={comp}
              className="flex items-center gap-1.5 p-1.5 rounded border cursor-pointer hover:bg-muted/50 transition-colors text-xs"
            >
              <Checkbox
                checked={form.competences_techniques.includes(comp)}
                onCheckedChange={() => toggleCompetence(comp)}
                className="h-3.5 w-3.5"
              />
              <span className="truncate" title={comp}>{comp}</span>
            </label>
          ))}
        </div>
        
        {form.competences_techniques.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-2 mt-2 border-t">
            {form.competences_techniques.map((c) => (
              <Badge key={c} variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                {c}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Habilitation électrique */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-yellow-500" />
          Habilitation électrique
        </h4>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Niveau</Label>
            <Select 
              value={form.habilitation_electrique_statut || 'none'} 
              onValueChange={(v) => setForm(f => ({ ...f, habilitation_electrique_statut: v === 'none' ? '' : v }))}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune</SelectItem>
                {HAB_ELEC_STATUTS.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Date obtention</Label>
            <Input
              type="date"
              value={form.habilitation_electrique_date}
              onChange={(e) => setForm(f => ({ ...f, habilitation_electrique_date: e.target.value }))}
              className="h-8 text-sm"
            />
          </div>
        </div>
      </div>

      {/* CACES */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium mb-3">CACES & Autorisations</h4>
        
        {form.caces.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {form.caces.map((c, i) => (
              <div key={i} className="flex items-center gap-2 p-1.5 bg-muted rounded text-xs">
                <Badge variant="secondary" className="text-xs">{c.type}</Badge>
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(c.date), 'dd/MM/yy', { locale: fr })}
                  {c.expiration && ` → ${format(new Date(c.expiration), 'dd/MM/yy', { locale: fr })}`}
                </span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="ml-auto h-5 w-5"
                  onClick={() => removeCaces(i)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-4 gap-2 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Type</Label>
            <Select 
              value={newCaces.type} 
              onValueChange={(v) => setNewCaces(c => ({ ...c, type: v }))}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="..." />
              </SelectTrigger>
              <SelectContent>
                {CACES_TYPES.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Obtention</Label>
            <Input
              type="date"
              value={newCaces.date}
              onChange={(e) => setNewCaces(c => ({ ...c, date: e.target.value }))}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Expiration</Label>
            <Input
              type="date"
              value={newCaces.expiration}
              onChange={(e) => setNewCaces(c => ({ ...c, expiration: e.target.value }))}
              className="h-8 text-xs"
            />
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={addCaces}
            disabled={!newCaces.type || !newCaces.date}
            className="h-8 gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end pt-2">
        <Button 
          size="sm"
          onClick={handleSave}
          disabled={updateComp.isPending}
          className="gap-1.5"
        >
          {updateComp.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Enregistrer
        </Button>
      </div>

      {/* Dialog ajouter compétence */}
      <Dialog open={showAddCompetence} onOpenChange={setShowAddCompetence}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une compétence</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Nom de la compétence</Label>
            <Input
              value={newCompetenceLabel}
              onChange={(e) => setNewCompetenceLabel(e.target.value)}
              placeholder="Ex: Maçonnerie, Climatisation..."
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCompetence(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleAddNewCompetence}
              disabled={!newCompetenceLabel.trim() || addCompetence.isPending}
            >
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
