/**
 * Onglet RH - Contact d'urgence, observations (N2 strict)
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Save, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { RHCollaborator } from '@/types/rh-suivi';

interface Props {
  collaborator: RHCollaborator;
}

export function RHTabRH({ collaborator }: Props) {
  const [notes, setNotes] = useState(collaborator.notes || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            Contact d'urgence
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Nom du contact</Label>
            <Input placeholder="Non renseigné" disabled />
          </div>
          <div className="space-y-2">
            <Label>Téléphone d'urgence</Label>
            <Input placeholder="Non renseigné" disabled />
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Les informations de contact d'urgence sont stockées de manière sécurisée et chiffrées.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Observations RH</CardTitle>
          <Button 
            size="sm" 
            onClick={handleSave}
            disabled={saving || notes === collaborator.notes}
            className="gap-1"
          >
            <Save className="h-4 w-4" />
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
