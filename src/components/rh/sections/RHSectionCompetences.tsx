/**
 * Section Compétences & Habilitations - Compact avec dropdowns
 */

import React, { useState, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Zap, Plus, X, Clock, Check, Loader2, ChevronDown } from 'lucide-react';
import { useAutoSaveCompetencies } from '@/hooks/useAutoSaveCollaborator';
import { useUniversCatalog } from '@/hooks/useUniversCatalog';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { RHCollaborator, CACESEntry } from '@/types/rh-suivi';
import { cn } from '@/lib/utils';

interface Props {
  collaborator: RHCollaborator;
}

const CACES_TYPES = ['CACES 1', 'CACES 2', 'CACES 3', 'CACES 4', 'CACES 5', 'CACES 6', 'NACELLE'];
const HAB_ELEC_OPTIONS = [
  { value: '__NONE__', label: 'Aucune' },
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
  const { saveField, isSaving } = useAutoSaveCompetencies(collaborator.id);
  const { data: universCatalog = [] } = useUniversCatalog();
  
  const [caces, setCaces] = useState<CACESEntry[]>((comp?.caces || []) as CACESEntry[]);
  const [competencesTech, setCompetencesTech] = useState<string[]>((comp?.competences_techniques || []) as string[]);
  const [newCaces, setNewCaces] = useState({ type: '', date: '', expiration: '' });
  const [competencesOpen, setCompetencesOpen] = useState(false);
  const [cacesOpen, setCacesOpen] = useState(false);

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

  const allCompetences = React.useMemo(() => {
    // Source unique : univers Apogée depuis univers_catalog
    return universCatalog.map(u => u.label);
  }, [universCatalog]);

  return (
    <div className="space-y-3">
      {/* Compétences techniques - Dropdown compact */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            Univers / Compétences (Apogée)
            {isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
          </Label>
        </div>
        
        <Popover open={competencesOpen} onOpenChange={setCompetencesOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between h-8 text-xs font-normal"
            >
              <span className="truncate">
                {competencesTech.length > 0 
                  ? `${competencesTech.length} sélectionnée(s)`
                  : 'Sélectionner...'
                }
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2 bg-background z-50" align="start">
            <div className="max-h-48 overflow-y-auto space-y-0.5">
              {allCompetences.map((compLabel) => (
                <label
                  key={compLabel}
                  className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer text-xs"
                >
                  <Checkbox
                    checked={competencesTech.includes(compLabel)}
                    onCheckedChange={() => toggleCompetence(compLabel)}
                    className="h-3.5 w-3.5"
                  />
                  <span className="truncate">{compLabel}</span>
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        
        {/* Badges des compétences sélectionnées */}
        {competencesTech.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {competencesTech.map((c) => (
              <Badge 
                key={c} 
                variant="secondary" 
                className="text-[10px] px-1.5 py-0 h-5 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-100"
              >
                {c}
                <button
                  onClick={() => toggleCompetence(c)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Habilitation électrique - Ligne unique */}
      <div className="flex items-center gap-2 border-t pt-3">
        <Zap className="h-4 w-4 text-yellow-500 shrink-0" />
        <Label className="text-xs text-muted-foreground shrink-0">Hab. élec.</Label>
        <Select
          value={comp?.habilitation_electrique_statut || '__NONE__'}
          onValueChange={(v) => saveField('habilitation_electrique_statut', v === '__NONE__' ? null : v)}
        >
          <SelectTrigger className="h-7 w-20 text-xs">
            <SelectValue placeholder="--" />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            {HAB_ELEC_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={comp?.habilitation_electrique_date || ''}
          onChange={(e) => saveField('habilitation_electrique_date', e.target.value)}
          className="h-7 text-xs w-28"
          placeholder="Date"
        />
      </div>

      {/* CACES - Compact */}
      <div className="border-t pt-3 space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">CACES & Autorisations</Label>
          <Popover open={cacesOpen} onOpenChange={setCacesOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 px-2">
                <Plus className="h-3 w-3" />
                Ajouter
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3 bg-background z-50" align="end">
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">Type</Label>
                  <Select
                    value={newCaces.type}
                    onValueChange={(v) => setNewCaces(c => ({ ...c, type: v }))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {CACES_TYPES.map(t => (
                        <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
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
                </div>
                <Button 
                  size="sm"
                  onClick={() => {
                    addCacesEntry();
                    setCacesOpen(false);
                  }}
                  disabled={!newCaces.type || !newCaces.date}
                  className="w-full h-7 text-xs"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Ajouter
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        {caces.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {caces.map((c, i) => (
              <Badge 
                key={i} 
                variant="outline" 
                className="text-[10px] px-1.5 py-0.5 h-auto gap-1"
              >
                <span className="font-medium">{c.type}</span>
                <span className="text-muted-foreground">
                  {c.date && format(new Date(c.date), 'MM/yy', { locale: fr })}
                  {c.expiration && ` → ${format(new Date(c.expiration), 'MM/yy', { locale: fr })}`}
                </span>
                <button
                  onClick={() => removeCaces(i)}
                  className="ml-0.5 hover:text-destructive"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">Aucun CACES</p>
        )}
      </div>
    </div>
  );
}
