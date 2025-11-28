/**
 * Toggle pour les notes internes dans le chat support
 * Phase 3 - UI : Checkbox note interne
 */

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Lock, Eye } from 'lucide-react';

interface InternalNoteToggleProps {
  isInternalNote: boolean;
  onToggle: (checked: boolean) => void;
}

export function InternalNoteToggle({ isInternalNote, onToggle }: InternalNoteToggleProps) {
  return (
    <div className="flex items-center gap-2 px-1">
      <Checkbox
        id="internal-note"
        checked={isInternalNote}
        onCheckedChange={(checked) => onToggle(checked === true)}
      />
      <Label
        htmlFor="internal-note"
        className={`text-xs cursor-pointer flex items-center gap-1 ${
          isInternalNote ? 'text-amber-600 font-medium' : 'text-muted-foreground'
        }`}
      >
        {isInternalNote ? (
          <>
            <Lock className="w-3 h-3" />
            Note interne (invisible pour l'utilisateur)
          </>
        ) : (
          <>
            <Eye className="w-3 h-3" />
            Message visible par l'utilisateur
          </>
        )}
      </Label>
    </div>
  );
}
