import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { CreditCard } from 'lucide-react';

interface CarteData {
  active: boolean;
  numero: string;
  fournisseur: string;
}

interface RHCartePopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  value: CarteData;
  onSave: (data: CarteData) => void;
}

export function RHCartePopup({ open, onOpenChange, title, value, onSave }: RHCartePopupProps) {
  const [data, setData] = useState<CarteData>({ active: false, numero: '', fournisseur: '' });

  useEffect(() => {
    if (open) {
      setData(value);
    }
  }, [open, value]);

  const handleSave = () => {
    onSave(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="active" className="text-sm">Carte attribuée</Label>
            <Switch
              id="active"
              checked={data.active}
              onCheckedChange={(checked) => setData({ ...data, active: checked })}
            />
          </div>
          {data.active && (
            <>
              <div>
                <Label htmlFor="numero" className="text-xs">Numéro de carte</Label>
                <Input
                  id="numero"
                  value={data.numero}
                  onChange={(e) => setData({ ...data, numero: e.target.value })}
                  placeholder="Ex: **** 1234"
                  className="h-8"
                />
              </div>
              <div>
                <Label htmlFor="fournisseur" className="text-xs">Fournisseur</Label>
                <Input
                  id="fournisseur"
                  value={data.fournisseur}
                  onChange={(e) => setData({ ...data, fournisseur: e.target.value })}
                  placeholder="Ex: Total, Shell..."
                  className="h-8"
                />
              </div>
            </>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button size="sm" onClick={handleSave}>
              Enregistrer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function formatCarteDisplay(active: boolean, numero?: string): string {
  if (!active) return '—';
  if (numero) return `Oui (${numero})`;
  return 'Oui';
}
