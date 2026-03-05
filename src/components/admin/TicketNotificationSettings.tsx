/**
 * Admin UI for managing ticket notification email recipients.
 * Allows N5+ users to add/remove/toggle email addresses that receive
 * notifications when new tickets are created.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Plus, Trash2, Bell, Loader2 } from 'lucide-react';
import { successToast, errorToast } from '@/lib/toastHelpers';

interface Recipient {
  id: string;
  email: string;
  label: string | null;
  is_active: boolean;
  created_at: string;
}

export default function TicketNotificationSettings() {
  const queryClient = useQueryClient();
  const [newEmail, setNewEmail] = useState('');
  const [newLabel, setNewLabel] = useState('');

  const { data: recipients = [], isLoading } = useQuery({
    queryKey: ['ticket-notification-recipients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_notification_recipients' as any)
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as Recipient[];
    },
  });

  const addRecipient = useMutation({
    mutationFn: async ({ email, label }: { email: string; label: string }) => {
      const { error } = await supabase
        .from('ticket_notification_recipients' as any)
        .insert({ email, label: label || null } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-notification-recipients'] });
      setNewEmail('');
      setNewLabel('');
      successToast('Destinataire ajouté');
    },
    onError: () => errorToast('Erreur lors de l\'ajout'),
  });

  const toggleRecipient = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('ticket_notification_recipients' as any)
        .update({ is_active } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-notification-recipients'] });
    },
    onError: () => errorToast('Erreur lors de la mise à jour'),
  });

  const deleteRecipient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ticket_notification_recipients' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-notification-recipients'] });
      successToast('Destinataire supprimé');
    },
    onError: () => errorToast('Erreur lors de la suppression'),
  });

  const handleAdd = () => {
    const email = newEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errorToast('Adresse email invalide');
      return;
    }
    addRecipient.mutate({ email, label: newLabel.trim() });
  };

  const activeCount = recipients.filter(r => r.is_active).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Notifications email – Nouveaux tickets</CardTitle>
              <CardDescription>
                Les adresses ci-dessous recevront un email à chaque création de ticket.
                {activeCount > 0 && (
                  <Badge variant="secondary" className="ml-2">{activeCount} actif{activeCount > 1 ? 's' : ''}</Badge>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add form */}
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="email@exemple.com"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              className="flex-1"
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <Input
              placeholder="Label (optionnel)"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              className="w-40"
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <Button onClick={handleAdd} disabled={addRecipient.isPending} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Ajouter
            </Button>
          </div>

          {/* Recipients list */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : recipients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Aucun destinataire configuré</p>
              <p className="text-sm">Ajoutez une adresse email pour recevoir les notifications.</p>
            </div>
          ) : (
            <div className="divide-y divide-border rounded-lg border">
              {recipients.map(r => (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <Switch
                    checked={r.is_active}
                    onCheckedChange={checked => toggleRecipient.mutate({ id: r.id, is_active: checked })}
                  />
                  <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-medium ${!r.is_active ? 'text-muted-foreground line-through' : ''}`}>
                      {r.email}
                    </span>
                    {r.label && (
                      <span className="text-xs text-muted-foreground ml-2">({r.label})</span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => deleteRecipient.mutate(r.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
