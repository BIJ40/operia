/**
 * Onglet Sécurité & EPI
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Save, Shield, ShirtIcon, Footprints } from 'lucide-react';
import { useUpdateEpiProfile } from '@/hooks/useRHSuivi';
import type { RHCollaborator, RHEpiProfile } from '@/types/rh-suivi';

interface Props {
  collaborator: RHCollaborator;
}

const EPI_OPTIONS = [
  'Casque', 'Lunettes', 'Gants', 'Chaussures de sécurité', 
  'Gilet haute visibilité', 'Harnais', 'Masque', 'Bouchons d\'oreilles'
];

function EpiStatusBadge({ status }: { status: 'OK' | 'TO_RENEW' | 'MISSING' }) {
  const variants = {
    OK: { label: 'OK', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    TO_RENEW: { label: 'À renouveler', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    MISSING: { label: 'Manquant', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  };
  const { label, className } = variants[status];
  return <Badge className={className}>{label}</Badge>;
}

export function RHTabSecurite({ collaborator }: Props) {
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
      {/* Statut EPI */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Statut EPI
          </CardTitle>
          <EpiStatusBadge status={form.statut_epi as 'OK' | 'TO_RENEW' | 'MISSING'} />
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Statut</Label>
            <Select 
              value={form.statut_epi} 
              onValueChange={(v) => setForm(f => ({ ...f, statut_epi: v as 'OK' | 'TO_RENEW' | 'MISSING' }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OK">OK</SelectItem>
                <SelectItem value="TO_RENEW">À renouveler</SelectItem>
                <SelectItem value="MISSING">Manquant</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Dernière remise</Label>
            <Input
              type="date"
              value={form.date_derniere_remise}
              onChange={(e) => setForm(f => ({ ...f, date_derniere_remise: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Prochain renouvellement</Label>
            <Input
              type="date"
              value={form.date_renouvellement}
              onChange={(e) => setForm(f => ({ ...f, date_renouvellement: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tailles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShirtIcon className="h-4 w-4" />
            Tailles équipements
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-4">
          <div className="space-y-2">
            <Label>Taille haut</Label>
            <Input
              value={form.taille_haut}
              onChange={(e) => setForm(f => ({ ...f, taille_haut: e.target.value }))}
              placeholder="M, L, XL..."
            />
          </div>
          <div className="space-y-2">
            <Label>Taille bas</Label>
            <Input
              value={form.taille_bas}
              onChange={(e) => setForm(f => ({ ...f, taille_bas: e.target.value }))}
              placeholder="40, 42, 44..."
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Footprints className="h-3 w-3" />
              Pointure
            </Label>
            <Input
              value={form.pointure}
              onChange={(e) => setForm(f => ({ ...f, pointure: e.target.value }))}
              placeholder="42, 43..."
            />
          </div>
          <div className="space-y-2">
            <Label>Taille gants</Label>
            <Input
              value={form.taille_gants}
              onChange={(e) => setForm(f => ({ ...f, taille_gants: e.target.value }))}
              placeholder="8, 9, 10..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Notes sécurité */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes sécurité</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={form.notes_securite}
            onChange={(e) => setForm(f => ({ ...f, notes_securite: e.target.value }))}
            placeholder="Remarques sur la sécurité, besoins spécifiques..."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave}
          disabled={!hasChanges || updateEpi.isPending}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          Enregistrer les modifications
        </Button>
      </div>
    </div>
  );
}
