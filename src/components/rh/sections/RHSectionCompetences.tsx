/**
 * Section Compétences & Habilitations - Édition inline avec auto-save
 */

import React, { useState, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Zap, Plus, X, Clock, Check, Loader2 } from 'lucide-react';
import { useAutoSaveCompetencies } from '@/hooks/useAutoSaveCollaborator';
import { useCompetencesCatalogue, useAddCompetenceCatalogue } from '@/hooks/useRHCompetencesCatalogue';
import { InlineEdit, InlineSelect } from '@/components/ui/inline-edit';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { RHCollaborator, CACESEntry } from '@/types/rh-suivi';

interface Props {
  collaborator: RHCollaborator;
}

const CACES_TYPES = ['CACES 1', 'CACES 2', 'CACES 3', 'CACES 4', 'CACES 5', 'CACES 6', 'NACELLE'];
const HAB_ELEC_OPTIONS = [
  { value: '', label: 'Aucune' },
  { value: 'B0', label: 'B0' },
  { value: 'B1', label: 'B1' },
  { value: 'B1V', label: 'B1V' },
  { value: 'B2', label: 'B2' },
  { value: 'B2V', label: 'B2V' },
  { value: 'BR', label: 'BR' },
  { value: 'BC', label: 'BC' },
  { value: 'H0', label: 'H0' },
  { value: 'H1', label: 'H1' },
  { value: 'H1V', label: 'H1V' },
  { value: 'H2', label: 'H2' },
  { value: 'H2V', label: 'H2V' },
];

export function RHSectionCompetences({ collaborator }: Props) {
  const comp = collaborator.competencies;
  const { saveField, saveMultiple, isSaving } = useAutoSaveCompetencies(collaborator.id);
  const { data: catalogueCompetences = [] } = useCompetencesCatalogue();
  const addCompetence = useAddCompetenceCatalogue();
  
  const [caces, setCaces] = useState<CACESEntry[]>((comp?.caces || []) as CACESEntry[]);
  const [competencesTech, setCompetencesTech] = useState<string[]>((comp?.competences_techniques || []) as string[]);
  const [newCaces, setNewCaces] = useState({ type: '', date: '', expiration: '' });
  const [showAddCompetence, setShowAddCompetence] = useState(false);
  const [newCompetenceLabel, setNewCompetenceLabel] = useState('');

  const toggleCompetence = useCallback(async (label: string) => {
    const has = competencesTech.includes(label);
    const newList = has
      ? competencesTech.filter(c => c !== label)
      : [...competencesTech, label];
    
    setCompetencesTech(newList);
    await saveField('competences_techniques', newList);
  }, [competencesTech, saveField]);

  const addCacesEntry = async () => {
    if (!newCaces.type || !newCaces.date) return;
    const newList = [...caces, newCaces];
    setCaces(newList);
    setNewCaces({ type: '', date: '', expiration: '' });
    await saveField('caces', newList);
  };

  const removeCaces = async (index: number) => {
    const newList = caces.filter((_, i) => i !== index);
    setCaces(newList);
    await saveField('caces', newList);
  };

  const handleAddNewCompetence = () => {
    if (!newCompetenceLabel.trim()) return;
    addCompetence.mutate(newCompetenceLabel.trim(), {
      onSuccess: async () => {
        const newList = [...competencesTech, newCompetenceLabel.trim()];
        setCompetencesTech(newList);
        await saveField('competences_techniques', newList);
        setNewCompetenceLabel('');
        setShowAddCompetence(false);
      },
    });
  };

  const allCompetences = React.useMemo(() => {
    const base = catalogueCompetences.map(c => c.label);
    const extras = competencesTech.filter(c => !base.some(b => b.toLowerCase() === c.toLowerCase()));
    return [...base, ...extras];
  }, [catalogueCompetences, competencesTech]);

  return (
    <div className="space-y-6">
      {/* Compétences techniques */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            Compétences techniques
            {isSaving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          </h4>
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
          {allCompetences.map((compLabel) => (
            <label
              key={compLabel}
              className="flex items-center gap-1.5 p-1.5 rounded border cursor-pointer hover:bg-muted/50 transition-colors text-xs"
            >
              <Checkbox
                checked={competencesTech.includes(compLabel)}
                onCheckedChange={() => toggleCompetence(compLabel)}
                className="h-3.5 w-3.5"
              />
              <span className="truncate" title={compLabel}>{compLabel}</span>
            </label>
          ))}
        </div>
        
        {competencesTech.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-2 mt-2 border-t">
            {competencesTech.map((c) => (
              <Badge key={c} variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-100">
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
        <div className="grid sm:grid-cols-2 gap-4">
          <InlineSelect
            label="Niveau"
            value={comp?.habilitation_electrique_statut || ''}
            options={HAB_ELEC_OPTIONS}
            onSave={(v) => saveField('habilitation_electrique_statut', v)}
            placeholder="Sélectionner..."
          />
          <InlineEdit
            label="Date obtention"
            value={comp?.habilitation_electrique_date || ''}
            onSave={(v) => saveField('habilitation_electrique_date', v)}
            type="date"
          />
        </div>
      </div>

      {/* CACES */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium mb-3">CACES & Autorisations</h4>
        
        {caces.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {caces.map((c, i) => (
              <div key={i} className="flex items-center gap-2 p-1.5 bg-muted rounded text-xs">
                <Badge variant="secondary" className="text-xs">{c.type}</Badge>
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {c.date && format(new Date(c.date), 'dd/MM/yy', { locale: fr })}
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
            <select
              value={newCaces.type}
              onChange={(e) => setNewCaces(c => ({ ...c, type: e.target.value }))}
              className="w-full h-8 text-xs rounded-md border border-input bg-background px-2"
            >
              <option value="">...</option>
              {CACES_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
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
            onClick={addCacesEntry}
            disabled={!newCaces.type || !newCaces.date}
            className="h-8 gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
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
