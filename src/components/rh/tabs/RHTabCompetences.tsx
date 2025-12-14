/**
 * Onglet Compétences & Habilitations
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Save, Zap, Plus, X, Clock, Wrench, Printer } from 'lucide-react';
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

export function RHTabCompetences({ collaborator }: Props) {
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
    updateComp.mutate({
      collaboratorId: collaborator.id,
      data: form,
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
        // Auto-select the new competence
        setForm(f => ({
          ...f,
          competences_techniques: [...f.competences_techniques, newCompetenceLabel.trim()],
        }));
        setNewCompetenceLabel('');
        setShowAddCompetence(false);
      },
    });
  };

  // Get all unique competences (catalogue + déjà présentes sur le collaborateur)
  const allCompetences = React.useMemo(() => {
    const base = catalogueCompetences.map(c => c.label);
    const extras = form.competences_techniques.filter(c => !base.some(b => b.toLowerCase() === c.toLowerCase()));
    return [...base, ...extras];
  }, [catalogueCompetences, form.competences_techniques]);

  return (
    <div className="space-y-6">
      {/* Compétences techniques */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="h-4 w-4 text-helpconfort-blue" />
            Compétences techniques
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[260px] overflow-y-auto pr-1">
            {allCompetences.map((comp) => (
              <label
                key={comp}
                className="flex items-center gap-2 p-2 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={form.competences_techniques.includes(comp)}
                  onCheckedChange={() => toggleCompetence(comp)}
                />
                <span className="text-xs truncate" title={comp}>{comp}</span>
              </label>
            ))}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddCompetence(true)}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            Ajouter une compétence
          </Button>

          {form.competences_techniques.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {form.competences_techniques.map((c) => (
                <Badge key={c} variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                  {c}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Habilitation électrique */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            Habilitation électrique
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Niveau d'habilitation</Label>
            <Select 
              value={form.habilitation_electrique_statut} 
              onValueChange={(v) => setForm(f => ({ ...f, habilitation_electrique_statut: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Aucune</SelectItem>
                {HAB_ELEC_STATUTS.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date d'obtention</Label>
            <Input
              type="date"
              value={form.habilitation_electrique_date}
              onChange={(e) => setForm(f => ({ ...f, habilitation_electrique_date: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* CACES */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">CACES & Autorisations de conduite</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Liste CACES existants */}
          {form.caces.length > 0 && (
            <div className="space-y-2">
              {form.caces.map((c, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                  <Badge variant="secondary">{c.type}</Badge>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(c.date), 'dd/MM/yyyy', { locale: fr })}
                    {c.expiration && ` → ${format(new Date(c.expiration), 'dd/MM/yyyy', { locale: fr })}`}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="ml-auto h-6 w-6"
                    onClick={() => removeCaces(i)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Ajouter CACES */}
          <div className="grid gap-2 sm:grid-cols-4 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select 
                value={newCaces.type} 
                onValueChange={(v) => setNewCaces(c => ({ ...c, type: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Type..." />
                </SelectTrigger>
                <SelectContent>
                  {CACES_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date obtention</Label>
              <Input
                type="date"
                value={newCaces.date}
                onChange={(e) => setNewCaces(c => ({ ...c, date: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Expiration</Label>
              <Input
                type="date"
                value={newCaces.expiration}
                onChange={(e) => setNewCaces(c => ({ ...c, expiration: e.target.value }))}
              />
            </div>
            <Button 
              variant="outline" 
              onClick={addCaces}
              disabled={!newCaces.type || !newCaces.date}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dernière MAJ */}
      {comp?.derniere_maj && (
        <p className="text-xs text-muted-foreground text-right">
          Dernière mise à jour : {format(new Date(comp.derniere_maj), 'dd/MM/yyyy HH:mm', { locale: fr })}
        </p>
      )}

      {/* Save button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave}
          disabled={updateComp.isPending}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          Enregistrer les modifications
        </Button>
      </div>

      {/* Dialog pour ajouter une compétence */}
      <Dialog open={showAddCompetence} onOpenChange={setShowAddCompetence}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une compétence</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nom de la compétence</Label>
              <Input
                value={newCompetenceLabel}
                onChange={(e) => setNewCompetenceLabel(e.target.value)}
                placeholder="Ex: Maçonnerie, Climatisation..."
              />
            </div>
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
