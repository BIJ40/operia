/**
 * Section Essentiel - Simplifiée : Dates et Observations
 * (ICE est maintenant dans le header principal)
 */

import { useAutoSaveCollaborator } from '@/hooks/useAutoSaveCollaborator';
import { InlineEdit } from '@/components/ui/inline-edit';
import { Label } from '@/components/ui/label';
import { Calendar } from 'lucide-react';
import type { RHCollaborator } from '@/types/rh-suivi';

interface Props {
  collaborator: RHCollaborator;
}

export function RHSectionEssentiel({ collaborator }: Props) {
  const { saveField } = useAutoSaveCollaborator(collaborator.id);

  return (
    <div className="space-y-3">
      {/* Dates Entrée / Sortie */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Entrée
          </Label>
          <InlineEdit
            value={collaborator.hiring_date || ''}
            onSave={(v) => saveField('hiring_date', v)}
            type="date"
            placeholder="--/--/----"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Sortie
          </Label>
          <InlineEdit
            value={collaborator.leaving_date || ''}
            onSave={(v) => saveField('leaving_date', v)}
            type="date"
            placeholder="--/--/----"
          />
        </div>
      </div>

      {/* Observations RH */}
      <div className="border-t pt-3">
        <InlineEdit
          label="Observations RH"
          value={collaborator.notes}
          onSave={(v) => saveField('notes', v)}
          placeholder="Notes confidentielles..."
          type="textarea"
          debounceMs={1200}
        />
      </div>
    </div>
  );
}
