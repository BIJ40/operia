/**
 * ApporteurCreateDialog - Formulaire de création d'un apporteur
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { useCreateApporteur } from '@/hooks/useApporteurs';

interface ApporteurCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const TYPES = [
  { value: 'agence_immo', label: 'Agence Immobilière' },
  { value: 'syndic', label: 'Syndic' },
  { value: 'assurance', label: 'Assurance' },
  { value: 'courtier', label: 'Courtier' },
];

export function ApporteurCreateDialog({
  open,
  onOpenChange,
  onSuccess,
}: ApporteurCreateDialogProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState('agence_immo');
  const [apogeeClientId, setApogeeClientId] = useState('');
  const [isActive, setIsActive] = useState(true);

  const createApporteur = useCreateApporteur();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;

    try {
      await createApporteur.mutateAsync({
        name: name.trim(),
        type,
        apogee_client_id: apogeeClientId ? parseInt(apogeeClientId, 10) : null,
        is_active: isActive,
      });
      
      // Reset form
      setName('');
      setType('agence_immo');
      setApogeeClientId('');
      setIsActive(true);
      
      onSuccess();
    } catch {
      // Error handled in hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvel Apporteur</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom de l'organisation"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type *</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apogee_client_id">ID Client Apogée (optionnel)</Label>
            <Input
              id="apogee_client_id"
              type="number"
              value={apogeeClientId}
              onChange={(e) => setApogeeClientId(e.target.value)}
              placeholder="ID numérique"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_active">Actif</Label>
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={createApporteur.isPending || !name.trim()}>
              {createApporteur.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Créer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
