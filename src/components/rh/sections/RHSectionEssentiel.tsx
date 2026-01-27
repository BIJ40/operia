/**
 * Section Essentiel - Simplifiée : Dates, ICE, Observations
 * (Nom/Prénom/Email/Tel/Type/Role sont dans le header)
 */

import { useState, useEffect } from 'react';
import { AlertTriangle, Loader2, Calendar } from 'lucide-react';
import { useSensitiveData } from '@/hooks/useSensitiveData';
import { useAutoSaveCollaborator } from '@/hooks/useAutoSaveCollaborator';
import { InlineEdit } from '@/components/ui/inline-edit';
import { Label } from '@/components/ui/label';
import type { RHCollaborator } from '@/types/rh-suivi';

interface Props {
  collaborator: RHCollaborator;
}

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

      {/* Contact d'urgence (ICE) */}
      <div className="border-t pt-3">
        <h4 className="text-xs font-medium flex items-center gap-2 mb-2 text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
          Contact d'urgence (ICE)
          {isUpdating && <Loader2 className="h-3 w-3 animate-spin" />}
        </h4>
        
        {loadingSensitive ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <InlineEdit
              label="Nom"
              value={emergencyContact}
              onSave={handleSaveEmergencyContact}
              placeholder="Marie Dupont"
            />
            <InlineEdit
              label="Téléphone"
              value={emergencyPhone}
              onSave={handleSaveEmergencyPhone}
              placeholder="06 12 34 56 78"
              type="tel"
            />
          </div>
        )}
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
