/**
 * Composant ligne travail effectué
 */

import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TravailEffectue } from '../types';

interface TravailItemProps {
  travail: TravailEffectue;
  onChange: (travail: TravailEffectue) => void;
  onRemove: () => void;
}

export function TravailItem({ travail, onChange, onRemove }: TravailItemProps) {
  return (
    <div className="flex gap-2 items-start">
      <Input
        placeholder="Description du travail effectué..."
        value={travail.description}
        onChange={(e) => onChange({ ...travail, description: e.target.value })}
        className="flex-1"
      />
      <Input
        type="number"
        placeholder="Qté"
        value={travail.quantite || ''}
        onChange={(e) => onChange({ ...travail, quantite: Number(e.target.value) || undefined })}
        className="w-20"
      />
      <Input
        placeholder="Unité"
        value={travail.unite || ''}
        onChange={(e) => onChange({ ...travail, unite: e.target.value })}
        className="w-20"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="text-destructive hover:text-destructive shrink-0"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
