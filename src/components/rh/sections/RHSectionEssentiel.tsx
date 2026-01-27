/**
 * Section Essentiel - Fusionne Identité + RH (compact)
 */

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Save, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSensitiveData } from '@/hooks/useSensitiveData';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { RHCollaborator } from '@/types/rh-suivi';

interface Props {
  collaborator: RHCollaborator;
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-0.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <p className="text-sm font-medium">{value || '-'}</p>
    </div>
  );
}

export function RHSectionEssentiel({ collaborator }: Props) {
  const [notes, setNotes] = useState(collaborator.notes || '');
  const [saving, setSaving] = useState(false);
  
  // Use sensitive data hook for emergency contact
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

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('collaborators')
        .update({ notes })
        .eq('id', collaborator.id);
      
      if (error) throw error;
      toast.success('Observations enregistrées');
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };
  
  const handleSaveEmergency = () => {
    updateSensitiveData({
      collaboratorId: collaborator.id,
      data: {
        emergency_contact: emergencyContact || null,
        emergency_phone: emergencyPhone || null,
      },
    });
  };
  
  const emergencyChanged = 
    emergencyContact !== (sensitiveData?.emergency_contact || '') ||
    emergencyPhone !== (sensitiveData?.emergency_phone || '');

  return (
    <div className="space-y-6">
      {/* Identité & Emploi - grid compact */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <InfoRow label="Nom" value={collaborator.last_name} />
        <InfoRow label="Prénom" value={collaborator.first_name} />
        <InfoRow label="Email" value={collaborator.email} />
        <InfoRow label="Téléphone" value={collaborator.phone} />
        <InfoRow label="Métier" value={collaborator.type} />
        <InfoRow label="Rôle" value={collaborator.role} />
        <InfoRow 
          label="Entrée" 
          value={collaborator.hiring_date 
            ? format(new Date(collaborator.hiring_date), 'dd/MM/yyyy', { locale: fr })
            : null
          } 
        />
        <InfoRow 
          label="Sortie" 
          value={collaborator.leaving_date 
            ? format(new Date(collaborator.leaving_date), 'dd/MM/yyyy', { locale: fr })
            : null
          } 
        />
      </div>

      {/* Contact d'urgence */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            Contact d'urgence
          </h4>
          <Button 
            size="sm" 
            variant="ghost"
            onClick={handleSaveEmergency}
            disabled={isUpdating || !emergencyChanged}
            className="h-7 gap-1"
          >
            {isUpdating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Sauver
          </Button>
        </div>
        
        {loadingSensitive ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement...
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Nom du contact</Label>
              <Input 
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder="Ex: Marie Dupont (épouse)"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Téléphone</Label>
              <Input 
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                placeholder="Ex: 06 12 34 56 78"
                className="h-8 text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Notes RH */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium">Observations RH</h4>
          <Button 
            size="sm"
            variant="ghost" 
            onClick={handleSaveNotes}
            disabled={saving || notes === collaborator.notes}
            className="h-7 gap-1"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Sauver
          </Button>
        </div>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes confidentielles..."
          rows={3}
          className="text-sm"
        />
      </div>
    </div>
  );
}
