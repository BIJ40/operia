/**
 * Composant ligne réserve
 */

import { Trash2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ReserveFormule } from '../types';
import { cn } from '@/lib/utils';

interface ReserveItemProps {
  reserve: ReserveFormule;
  onChange: (reserve: ReserveFormule) => void;
  onRemove: () => void;
}

export function ReserveItem({ reserve, onChange, onRemove }: ReserveItemProps) {
  return (
    <div className="flex gap-2 items-start">
      <Input
        placeholder="Description de la réserve..."
        value={reserve.description}
        onChange={(e) => onChange({ ...reserve, description: e.target.value })}
        className={cn("flex-1", reserve.estLevee && "line-through text-muted-foreground")}
      />
      <Button
        type="button"
        variant={reserve.estLevee ? "default" : "outline"}
        size="icon"
        onClick={() => onChange({ 
          ...reserve, 
          estLevee: !reserve.estLevee,
          dateLevee: !reserve.estLevee ? new Date().toISOString() : undefined
        })}
        className={cn(
          "shrink-0",
          reserve.estLevee && "bg-green-600 hover:bg-green-700"
        )}
        title={reserve.estLevee ? "Réserve levée" : "Marquer comme levée"}
      >
        <CheckCircle className="h-4 w-4" />
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
