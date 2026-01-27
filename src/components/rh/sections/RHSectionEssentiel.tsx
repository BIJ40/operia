/**
 * Section Essentiel - Édition inline avec auto-save
 */

import { useState, useEffect } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useSensitiveData } from '@/hooks/useSensitiveData';
import { useAutoSaveCollaborator } from '@/hooks/useAutoSaveCollaborator';
import { InlineEdit, InlineSelect } from '@/components/ui/inline-edit';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { RHCollaborator } from '@/types/rh-suivi';

interface Props {
  collaborator: RHCollaborator;
}

const TYPE_OPTIONS = [
  { value: 'TECHNICIEN', label: 'Technicien' },
  { value: 'ASSISTANTE', label: 'Assistante' },
  { value: 'DIRIGEANT', label: 'Dirigeant' },
  { value: 'COMMERCIAL', label: 'Commercial' },
  { value: 'APPRENTI', label: 'Apprenti' },
  { value: 'STAGIAIRE', label: 'Stagiaire' },
  { value: 'AUTRE', label: 'Autre' },
];

export function RHSectionEssentiel({ collaborator }: Props) {
  const { saveField } = useAutoSaveCollaborator(collaborator.id);
  
  // Sensitive data for emergency contact
  const { 
    sensitiveData, 
    isLoading: loadingSensitive, 
    updateSensitiveData,
    isUpdating 
  } = useSensitiveData(collaborator.id);
  
  const [emergencyContact, setEmergencyContact] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  
  // Sync sensitive data when loaded
  useEffect(() => {
    if (sensitiveData) {
      setEmergencyContact(sensitiveData.emergency_contact || '');
      setEmergencyPhone(sensitiveData.emergency_phone || '');
    }
  }, [sensitiveData]);

  const handleSaveEmergencyContact = async (value: string) => {
    setEmergencyContact(value);
    updateSensitiveData({
      collaboratorId: collaborator.id,
      data: {
        emergency_contact: value || null,
        emergency_phone: emergencyPhone || null,
      },
    });
  };

  const handleSaveEmergencyPhone = async (value: string) => {
    setEmergencyPhone(value);
    updateSensitiveData({
      collaboratorId: collaborator.id,
      data: {
        emergency_contact: emergencyContact || null,
        emergency_phone: value || null,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Identité & Emploi - grid compact */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <InlineEdit
          label="Nom"
          value={collaborator.last_name}
          onSave={(v) => saveField('last_name', v)}
          placeholder="Nom..."
        />
        <InlineEdit
          label="Prénom"
          value={collaborator.first_name}
          onSave={(v) => saveField('first_name', v)}
          placeholder="Prénom..."
        />
        <InlineEdit
          label="Email"
          value={collaborator.email}
          onSave={(v) => saveField('email', v)}
          placeholder="email@..."
          type="email"
        />
        <InlineEdit
          label="Téléphone"
          value={collaborator.phone}
          onSave={(v) => saveField('phone', v)}
          placeholder="06..."
          type="tel"
        />
        <InlineSelect
          label="Métier"
          value={collaborator.type}
          options={TYPE_OPTIONS}
          onSave={(v) => saveField('type', v)}
          placeholder="Sélectionner..."
        />
        <InlineEdit
          label="Rôle"
          value={collaborator.role}
          onSave={(v) => saveField('role', v)}
          placeholder="Poste..."
        />
        <InlineEdit
          label="Entrée"
          value={collaborator.hiring_date || ''}
          onSave={(v) => saveField('hiring_date', v)}
          type="date"
        />
        <InlineEdit
          label="Sortie"
          value={collaborator.leaving_date || ''}
          onSave={(v) => saveField('leaving_date', v)}
          type="date"
        />
      </div>

      {/* Contact d'urgence */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          Contact d'urgence
          {isUpdating && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        </h4>
        
        {loadingSensitive ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement...
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            <InlineEdit
              label="Nom du contact"
              value={emergencyContact}
              onSave={handleSaveEmergencyContact}
              placeholder="Ex: Marie Dupont (épouse)"
            />
            <InlineEdit
              label="Téléphone"
              value={emergencyPhone}
              onSave={handleSaveEmergencyPhone}
              placeholder="Ex: 06 12 34 56 78"
              type="tel"
            />
          </div>
        )}
      </div>

      {/* Notes RH */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium mb-3">Observations RH</h4>
        <InlineEdit
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
