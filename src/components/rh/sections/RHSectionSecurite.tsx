/**
 * Section Sécurité & EPI - Édition inline avec auto-save
 */

import { useAutoSaveEpi } from '@/hooks/useAutoSaveCollaborator';
import { InlineEdit, InlineSelect } from '@/components/ui/inline-edit';
import type { RHCollaborator } from '@/types/rh-suivi';

interface Props {
  collaborator: RHCollaborator;
}

const STATUT_OPTIONS = [
  { value: 'OK', label: '✓ OK' },
  { value: 'TO_RENEW', label: '⏰ À renouveler' },
  { value: 'MISSING', label: '⚠ Manquant' },
];

export function RHSectionSecurite({ collaborator }: Props) {
  const epi = collaborator.epi_profile;
  const { saveField } = useAutoSaveEpi(collaborator.id);

  return (
    <div className="space-y-6">
      {/* Statut + Dates */}
      <div className="grid grid-cols-3 gap-4">
        <InlineSelect
          label="Statut EPI"
          value={epi?.statut_epi || 'OK'}
          options={STATUT_OPTIONS}
          onSave={(v) => saveField('statut_epi', v)}
        />
        <InlineEdit
          label="Dernière remise"
          value={epi?.date_derniere_remise || ''}
          onSave={(v) => saveField('date_derniere_remise', v)}
          type="date"
        />
        <InlineEdit
          label="Renouvellement"
          value={epi?.date_renouvellement || ''}
          onSave={(v) => saveField('date_renouvellement', v)}
          type="date"
        />
      </div>

      {/* Tailles - ligne compacte */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium mb-3">Tailles équipements</h4>
        <div className="grid grid-cols-4 gap-4">
          <InlineEdit
            label="Haut"
            value={epi?.taille_haut || ''}
            onSave={(v) => saveField('taille_haut', v)}
            placeholder="M, L..."
          />
          <InlineEdit
            label="Bas"
            value={epi?.taille_bas || ''}
            onSave={(v) => saveField('taille_bas', v)}
            placeholder="40, 42..."
          />
          <InlineEdit
            label="Pointure"
            value={epi?.pointure || ''}
            onSave={(v) => saveField('pointure', v)}
            placeholder="42..."
          />
          <InlineEdit
            label="Gants"
            value={epi?.taille_gants || ''}
            onSave={(v) => saveField('taille_gants', v)}
            placeholder="8, 9..."
          />
        </div>
      </div>

      {/* Notes */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium mb-2">Notes sécurité</h4>
        <InlineEdit
          value={epi?.notes_securite || ''}
          onSave={(v) => saveField('notes_securite', v)}
          placeholder="Remarques, besoins spécifiques..."
          type="textarea"
          debounceMs={1200}
        />
      </div>
    </div>
  );
}
