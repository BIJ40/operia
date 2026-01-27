/**
 * Section Sécurité & EPI - Version compacte
 */

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Save, Loader2 } from 'lucide-react';
import { useUpdateEpiProfile } from '@/hooks/useRHSuivi';
import type { RHCollaborator, RHEpiProfile } from '@/types/rh-suivi';

interface Props {
  collaborator: RHCollaborator;
}

export function RHSectionSecurite({ collaborator }: Props) {
  const epi = collaborator.epi_profile;
  const updateEpi = useUpdateEpiProfile();
  
  const [form, setForm] = useState({
    taille_haut: epi?.taille_haut || '',
    taille_bas: epi?.taille_bas || '',
    pointure: epi?.pointure || '',
    taille_gants: epi?.taille_gants || '',
    statut_epi: epi?.statut_epi || 'OK',
    date_derniere_remise: epi?.date_derniere_remise || '',
    date_renouvellement: epi?.date_renouvellement || '',
    notes_securite: epi?.notes_securite || '',
  });

  const handleSave = () => {
    updateEpi.mutate({
      collaboratorId: collaborator.id,
      data: form as Partial<RHEpiProfile>,
    });
  };

  const hasChanges = JSON.stringify(form) !== JSON.stringify({
    taille_haut: epi?.taille_haut || '',
    taille_bas: epi?.taille_bas || '',
    pointure: epi?.pointure || '',
    taille_gants: epi?.taille_gants || '',
    statut_epi: epi?.statut_epi || 'OK',
    date_derniere_remise: epi?.date_derniere_remise || '',
    date_renouvellement: epi?.date_renouvellement || '',
    notes_securite: epi?.notes_securite || '',
  });

  return (
    <div className="space-y-6">
      {/* Statut + Dates */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Statut EPI</Label>
          <Select 
            value={form.statut_epi} 
            onValueChange={(v) => setForm(f => ({ ...f, statut_epi: v as 'OK' | 'TO_RENEW' | 'MISSING' }))}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OK">✓ OK</SelectItem>
              <SelectItem value="TO_RENEW">⏰ À renouveler</SelectItem>
              <SelectItem value="MISSING">⚠ Manquant</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Dernière remise</Label>
          <Input
            type="date"
            value={form.date_derniere_remise}
            onChange={(e) => setForm(f => ({ ...f, date_derniere_remise: e.target.value }))}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Renouvellement</Label>
          <Input
            type="date"
            value={form.date_renouvellement}
            onChange={(e) => setForm(f => ({ ...f, date_renouvellement: e.target.value }))}
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* Tailles - ligne compacte */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium mb-3">Tailles équipements</h4>
        <div className="grid grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Haut</Label>
            <Input
              value={form.taille_haut}
              onChange={(e) => setForm(f => ({ ...f, taille_haut: e.target.value }))}
              placeholder="M, L..."
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Bas</Label>
            <Input
              value={form.taille_bas}
              onChange={(e) => setForm(f => ({ ...f, taille_bas: e.target.value }))}
              placeholder="40, 42..."
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Pointure</Label>
            <Input
              value={form.pointure}
              onChange={(e) => setForm(f => ({ ...f, pointure: e.target.value }))}
              placeholder="42..."
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Gants</Label>
            <Input
              value={form.taille_gants}
              onChange={(e) => setForm(f => ({ ...f, taille_gants: e.target.value }))}
              placeholder="8, 9..."
              className="h-8 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="border-t pt-4">
        <Label className="text-xs">Notes sécurité</Label>
        <Textarea
          value={form.notes_securite}
          onChange={(e) => setForm(f => ({ ...f, notes_securite: e.target.value }))}
          placeholder="Remarques, besoins spécifiques..."
          rows={2}
          className="mt-1 text-sm"
        />
      </div>

      {/* Save */}
      <div className="flex justify-end pt-2">
        <Button 
          size="sm"
          onClick={handleSave}
          disabled={!hasChanges || updateEpi.isPending}
          className="gap-1.5"
        >
          {updateEpi.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Enregistrer
        </Button>
      </div>
    </div>
  );
}
