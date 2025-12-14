/**
 * Onglet RH - Contact d'urgence, observations (N2 strict)
 * Utilise useSensitiveData pour les données chiffrées
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Save, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSensitiveData } from '@/hooks/useSensitiveData';
import type { RHCollaborator } from '@/types/rh-suivi';

interface Props {
  collaborator: RHCollaborator;
}

export function RHTabRH({ collaborator }: Props) {
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            Contact d'urgence
          </CardTitle>
          <Button 
            size="sm" 
            onClick={handleSaveEmergency}
            disabled={isUpdating || !emergencyChanged}
            className="gap-1"
          >
            {isUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Enregistrer
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {loadingSensitive ? (
            <div className="sm:col-span-2 flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement des données sécurisées...
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Nom du contact</Label>
                <Input 
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="Ex: Marie Dupont (épouse)"
                />
              </div>
              <div className="space-y-2">
                <Label>Téléphone d'urgence</Label>
                <Input 
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  placeholder="Ex: 06 12 34 56 78"
                />
              </div>
            </>
          )}
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Les informations de contact d'urgence sont stockées de manière sécurisée et chiffrées (AES-256-GCM).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Observations RH</CardTitle>
          <Button 
            size="sm" 
            onClick={handleSaveNotes}
            disabled={saving || notes === collaborator.notes}
            className="gap-1"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Enregistrer
          </Button>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes confidentielles sur le collaborateur..."
            rows={6}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Ces observations sont réservées à l'usage interne RH (N2+).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
