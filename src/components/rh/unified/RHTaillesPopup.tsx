/**
 * Popup compact pour visualiser/éditer les tailles d'un collaborateur
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Eye, Save, ShirtIcon, Footprints } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RHCollaborator } from '@/types/rh-suivi';
import { useUpdateEpiProfile } from '@/hooks/useRHSuivi';
import { Badge } from '@/components/ui/badge';

// Options de tailles
const TAILLE_HAUT_OPTIONS = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL'];
const TAILLE_BAS_OPTIONS = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL'];
const POINTURE_OPTIONS = Array.from({ length: 15 }, (_, i) => String(36 + i)); // 36 à 50
const TAILLE_GANTS_OPTIONS = ['6', '7', '8', '9', '10', '11', '12'];

interface RHTaillesPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collaborator: RHCollaborator;
}

export function RHTaillesPopup({ open, onOpenChange, collaborator }: RHTaillesPopupProps) {
  const epi = collaborator.epi_profile;
  const updateEpi = useUpdateEpiProfile();
  
  const [form, setForm] = useState({
    taille_haut: epi?.taille_haut || '',
    taille_bas: epi?.taille_bas || '',
    pointure: epi?.pointure || '',
    taille_gants: epi?.taille_gants || '',
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setForm({
        taille_haut: epi?.taille_haut || '',
        taille_bas: epi?.taille_bas || '',
        pointure: epi?.pointure || '',
        taille_gants: epi?.taille_gants || '',
      });
    }
  }, [open, epi]);

  const handleSave = () => {
    updateEpi.mutate({
      collaboratorId: collaborator.id,
      data: form,
    }, {
      onSuccess: () => onOpenChange(false),
    });
  };

  const hasChanges = 
    form.taille_haut !== (epi?.taille_haut || '') ||
    form.taille_bas !== (epi?.taille_bas || '') ||
    form.pointure !== (epi?.pointure || '') ||
    form.taille_gants !== (epi?.taille_gants || '');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShirtIcon className="h-5 w-5" />
            Tailles équipements
          </DialogTitle>
          <DialogDescription>
            {collaborator.first_name} {collaborator.last_name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Taille Haut */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-sm">Haut</Label>
            <Select 
              value={form.taille_haut} 
              onValueChange={(v) => setForm(f => ({ ...f, taille_haut: v }))}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">—</SelectItem>
                {TAILLE_HAUT_OPTIONS.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Taille Bas */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-sm">Bas</Label>
            <Select 
              value={form.taille_bas} 
              onValueChange={(v) => setForm(f => ({ ...f, taille_bas: v }))}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">—</SelectItem>
                {TAILLE_BAS_OPTIONS.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Pointure */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-sm flex items-center justify-end gap-1">
              <Footprints className="h-3 w-3" />
              Pieds
            </Label>
            <Select 
              value={form.pointure} 
              onValueChange={(v) => setForm(f => ({ ...f, pointure: v }))}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">—</SelectItem>
                {POINTURE_OPTIONS.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Taille Gants */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-sm">Gants</Label>
            <Select 
              value={form.taille_gants} 
              onValueChange={(v) => setForm(f => ({ ...f, taille_gants: v }))}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">—</SelectItem>
                {TAILLE_GANTS_OPTIONS.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!hasChanges || updateEpi.isPending}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Indicateur compact pour la colonne du tableau
interface RHTaillesIndicatorProps {
  collaborator: RHCollaborator;
  onClick: () => void;
}

export function RHTaillesIndicator({ collaborator, onClick }: RHTaillesIndicatorProps) {
  const epi = collaborator.epi_profile;
  
  // Compte combien de tailles sont renseignées
  const filledCount = [
    epi?.taille_haut,
    epi?.taille_bas,
    epi?.pointure,
    epi?.taille_gants,
  ].filter(Boolean).length;
  
  // Résumé compact
  const summary = [
    epi?.taille_haut,
    epi?.taille_bas,
    epi?.pointure,
    epi?.taille_gants,
  ].filter(Boolean).join(' / ');
  
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-xs gap-1 font-normal"
      onClick={onClick}
      title={summary || 'Cliquer pour renseigner les tailles'}
    >
      <Eye className={cn(
        "h-3.5 w-3.5",
        filledCount === 4 ? "text-green-600" : 
        filledCount > 0 ? "text-orange-500" : 
        "text-muted-foreground"
      )} />
      {filledCount > 0 ? (
        <span className="truncate max-w-[80px]">{summary}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
    </Button>
  );
}
