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
import { Car } from 'lucide-react';

interface VehiculeData {
  marque: string;
  modele: string;
  immatriculation: string;
  autre: string;
}

interface RHVehiculePopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string | null;
  onSave: (data: VehiculeData) => void;
}

function parseVehiculeData(value: string | null): VehiculeData {
  if (!value) return { marque: '', modele: '', immatriculation: '', autre: '' };
  
  try {
    const parsed = JSON.parse(value);
    return {
      marque: parsed.marque || '',
      modele: parsed.modele || '',
      immatriculation: parsed.immatriculation || '',
      autre: parsed.autre || '',
    };
  } catch {
    // Fallback: old format was just a string
    return { marque: value, modele: '', immatriculation: '', autre: '' };
  }
}

export function RHVehiculePopup({ open, onOpenChange, value, onSave }: RHVehiculePopupProps) {
  const [data, setData] = useState<VehiculeData>({ marque: '', modele: '', immatriculation: '', autre: '' });

  useEffect(() => {
    if (open) {
      setData(parseVehiculeData(value));
    }
  }, [open, value]);

  const handleSave = () => {
    onSave(data);
    onOpenChange(false);
  };

  const hasData = data.marque || data.modele || data.immatriculation;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-4 w-4" />
            Véhicule
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="marque" className="text-xs">Marque</Label>
            <Input
              id="marque"
              value={data.marque}
              onChange={(e) => setData({ ...data, marque: e.target.value })}
              placeholder="Ex: Renault"
              className="h-8"
            />
          </div>
          <div>
            <Label htmlFor="modele" className="text-xs">Modèle</Label>
            <Input
              id="modele"
              value={data.modele}
              onChange={(e) => setData({ ...data, modele: e.target.value })}
              placeholder="Ex: Trafic"
              className="h-8"
            />
          </div>
          <div>
            <Label htmlFor="immat" className="text-xs">Immatriculation</Label>
            <Input
              id="immat"
              value={data.immatriculation}
              onChange={(e) => setData({ ...data, immatriculation: e.target.value })}
              placeholder="Ex: AB-123-CD"
              className="h-8"
            />
          </div>
          <div>
            <Label htmlFor="autre" className="text-xs">Autre</Label>
            <Input
              id="autre"
              value={data.autre}
              onChange={(e) => setData({ ...data, autre: e.target.value })}
              placeholder="Notes..."
              className="h-8"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button size="sm" onClick={handleSave}>
              {hasData ? 'Enregistrer' : 'Aucun véhicule'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function formatVehiculeDisplay(value: string | null): string {
  if (!value) return '—';
  
  try {
    const parsed = JSON.parse(value);
    const parts = [parsed.marque, parsed.modele].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : '—';
  } catch {
    return value || '—';
  }
}
