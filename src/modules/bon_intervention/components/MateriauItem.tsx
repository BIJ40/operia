/**
 * Composant ligne matériau utilisé
 */

import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MateriauUtilise } from '../types';

interface MateriauItemProps {
  materiau: MateriauUtilise;
  onChange: (materiau: MateriauUtilise) => void;
  onRemove: () => void;
}

export function MateriauItem({ materiau, onChange, onRemove }: MateriauItemProps) {
  return (
    <div className="flex gap-2 items-start">
      <Input
        placeholder="Désignation..."
        value={materiau.designation}
        onChange={(e) => onChange({ ...materiau, designation: e.target.value })}
        className="flex-1"
      />
      <Input
        type="number"
        placeholder="Qté"
        value={materiau.quantite || ''}
        onChange={(e) => onChange({ ...materiau, quantite: Number(e.target.value) || 0 })}
        className="w-20"
      />
      <Input
        placeholder="Unité"
        value={materiau.unite || ''}
        onChange={(e) => onChange({ ...materiau, unite: e.target.value })}
        className="w-24"
      />
      <Input
        placeholder="Réf."
        value={materiau.reference || ''}
        onChange={(e) => onChange({ ...materiau, reference: e.target.value })}
        className="w-24"
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
