/**
 * Composant ligne constat
 */

import { Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConstatRealise } from '../types';
import { cn } from '@/lib/utils';

interface ConstatItemProps {
  constat: ConstatRealise;
  onChange: (constat: ConstatRealise) => void;
  onRemove: () => void;
}

export function ConstatItem({ constat, onChange, onRemove }: ConstatItemProps) {
  return (
    <div className="flex gap-2 items-start">
      <Input
        placeholder="Description du point vérifié..."
        value={constat.description}
        onChange={(e) => onChange({ ...constat, description: e.target.value })}
        className="flex-1"
      />
      <Button
        type="button"
        variant={constat.conforme ? "default" : "outline"}
        size="icon"
        onClick={() => onChange({ ...constat, conforme: !constat.conforme })}
        className={cn(
          "shrink-0",
          constat.conforme && "bg-green-600 hover:bg-green-700"
        )}
        title={constat.conforme ? "Conforme" : "Non conforme"}
      >
        {constat.conforme ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
      </Button>
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
