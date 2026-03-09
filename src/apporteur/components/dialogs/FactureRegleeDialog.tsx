/**
 * FactureRegleeDialog — Déclarer une facture comme réglée
 * Demande la date de règlement et le type de paiement
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useApporteurDossierActions } from '../../hooks/useApporteurDossierActions';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dossierRef: string;
}

const PAYMENT_TYPES = [
  { value: 'virement', label: 'Virement bancaire' },
  { value: 'cheque', label: 'Chèque' },
  { value: 'cb', label: 'Carte bancaire' },
  { value: 'especes', label: 'Espèces' },
  { value: 'prelevement', label: 'Prélèvement' },
  { value: 'autre', label: 'Autre' },
];

export function FactureRegleeDialog({ open, onOpenChange, dossierRef }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const [dateReglement, setDateReglement] = useState(today);
  const [typeReglement, setTypeReglement] = useState('');
  const action = useApporteurDossierActions();

  const handleSubmit = () => {
    if (!dateReglement || !typeReglement) return;

    const typeLabel = PAYMENT_TYPES.find(t => t.value === typeReglement)?.label || typeReglement;

    action.mutate(
      {
        action: 'facture_reglee',
        dossierRefs: [dossierRef],
        dateReglement: new Date(dateReglement).toLocaleDateString('fr-FR'),
        typeReglement: typeLabel,
      },
      {
        onSuccess: () => {
          setDateReglement(today);
          setTypeReglement('');
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[hsl(var(--ap-success))]">
            <CheckCircle2 className="w-5 h-5" />
            Déclarer le règlement
          </DialogTitle>
          <DialogDescription>
            Dossier {dossierRef} — Indiquez les détails du paiement
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date-reglement">Date de règlement</Label>
            <Input
              id="date-reglement"
              type="date"
              value={dateReglement}
              onChange={(e) => setDateReglement(e.target.value)}
              max={today}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type-reglement">Type de règlement</Label>
            <Select value={typeReglement} onValueChange={setTypeReglement}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner le type..." />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={action.isPending || !dateReglement || !typeReglement}
          >
            {action.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            )}
            Confirmer le règlement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
