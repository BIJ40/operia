/**
 * Sélecteur de presets de filtres avec sauvegarde
 * Permet de sauvegarder le filtre actuel, charger un preset existant, ou supprimer
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Bookmark, ChevronDown, Plus, Trash2, Check, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFilterPresets, type FilterPreset } from '../hooks/useFilterPresets';
import type { TicketFilters } from '../types';

interface FilterPresetSelectorProps {
  currentFilters: TicketFilters;
  onLoadPreset: (filters: TicketFilters) => void;
  hasActiveFilters: boolean;
}

export function FilterPresetSelector({
  currentFilters,
  onLoadPreset,
  hasActiveFilters,
}: FilterPresetSelectorProps) {
  const { presets, savePreset, deletePreset, renamePreset, updatePreset } = useFilterPresets();

  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  const handleSave = () => {
    if (!newPresetName.trim()) return;
    const preset = savePreset(newPresetName, currentFilters);
    setActivePresetId(preset.id);
    setNewPresetName('');
    setShowSaveDialog(false);
  };

  const handleLoad = (preset: FilterPreset) => {
    onLoadPreset(preset.filters);
    setActivePresetId(preset.id);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deletePreset(id);
    if (activePresetId === id) {
      setActivePresetId(null);
    }
  };

  const handleStartEdit = (e: React.MouseEvent, preset: FilterPreset) => {
    e.stopPropagation();
    setEditingPresetId(preset.id);
    setEditingName(preset.name);
  };

  const handleFinishEdit = () => {
    if (editingPresetId && editingName.trim()) {
      renamePreset(editingPresetId, editingName);
    }
    setEditingPresetId(null);
    setEditingName('');
  };

  const handleUpdatePreset = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    updatePreset(id, currentFilters);
    setActivePresetId(id);
  };

  // Calculer le nombre de filtres actifs pour affichage
  const countActiveFilters = (filters: TicketFilters): number => {
    return Object.entries(filters).filter(([, v]) => {
      if (v === undefined || v === null) return false;
      if (typeof v === 'string') return v.trim().length > 0;
      if (Array.isArray(v)) return v.length > 0;
      return true;
    }).length;
  };

  return (
    <>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium rounded-full transition-all shadow-sm',
                  activePresetId
                    ? 'bg-indigo-100 dark:bg-indigo-900/50 border border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                    : 'bg-white/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-600/40 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/40'
                )}
              >
                <Bookmark className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {activePresetId
                    ? presets.find((p) => p.id === activePresetId)?.name || 'Preset'
                    : 'Mes filtres'}
                </span>
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Sauvegarder ou charger un jeu de filtres</p>
          </TooltipContent>
        </Tooltip>

        <DropdownMenuContent
          align="start"
          className="w-72 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-2xl border-indigo-100/50 dark:border-indigo-800/30 shadow-lg p-1"
        >
          {/* Bouton sauvegarder */}
          <DropdownMenuItem
            className="flex items-center gap-2 rounded-xl cursor-pointer"
            disabled={!hasActiveFilters}
            onSelect={() => setShowSaveDialog(true)}
          >
            <div className="h-7 w-7 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
              <Plus className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="font-medium">Sauvegarder le filtre actuel</span>
          </DropdownMenuItem>

          {presets.length > 0 && <DropdownMenuSeparator className="my-1" />}

          {/* Liste des presets */}
          {presets.map((preset) => (
            <DropdownMenuItem
              key={preset.id}
              className={cn(
                'flex items-center justify-between gap-2 rounded-xl cursor-pointer group',
                activePresetId === preset.id && 'bg-indigo-50 dark:bg-indigo-900/30'
              )}
              onSelect={() => handleLoad(preset)}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {activePresetId === preset.id && (
                  <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                )}
                {editingPresetId === preset.id ? (
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleFinishEdit();
                      if (e.key === 'Escape') {
                        setEditingPresetId(null);
                        setEditingName('');
                      }
                    }}
                    onBlur={handleFinishEdit}
                    onClick={(e) => e.stopPropagation()}
                    className="h-7 text-sm"
                    autoFocus
                  />
                ) : (
                  <span className="truncate font-medium">{preset.name}</span>
                )}
                <span className="text-xs text-muted-foreground shrink-0">
                  ({countActiveFilters(preset.filters)})
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                {/* Mettre à jour avec les filtres actuels */}
                {hasActiveFilters && activePresetId !== preset.id && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => handleUpdatePreset(e, preset.id)}
                        className="h-6 w-6 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/50 flex items-center justify-center"
                      >
                        <Check className="h-3 w-3 text-indigo-600" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Mettre à jour avec les filtres actuels</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {/* Renommer */}
                <button
                  onClick={(e) => handleStartEdit(e, preset)}
                  className="h-6 w-6 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center"
                >
                  <Pencil className="h-3 w-3 text-slate-500" />
                </button>
                {/* Supprimer */}
                <button
                  onClick={(e) => handleDelete(e, preset.id)}
                  className="h-6 w-6 rounded-full hover:bg-rose-100 dark:hover:bg-rose-900/50 flex items-center justify-center"
                >
                  <Trash2 className="h-3 w-3 text-rose-500" />
                </button>
              </div>
            </DropdownMenuItem>
          ))}

          {presets.length === 0 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              Aucun preset sauvegardé
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog de sauvegarde */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sauvegarder le filtre</DialogTitle>
            <DialogDescription>
              Donnez un nom à ce jeu de filtres pour le retrouver facilement.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Ex: Mes bugs à traiter, Tickets Jérôme..."
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={!newPresetName.trim()}>
              <Bookmark className="h-4 w-4 mr-2" />
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
