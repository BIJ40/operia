/**
 * FollowupPanel - Suivi commercial (notes, statut, prochaine action)
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClipboardCheck, Plus } from 'lucide-react';
import { useState } from 'react';
import { useProspectingFollowups, useCreateFollowup, useUpdateFollowup, type ProspectingFollowup } from '../hooks/useProspectingFollowups';

interface Props {
  apporteurId: string;
  apporteurName: string;
}

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  todo: { label: 'À faire', variant: 'outline' },
  in_progress: { label: 'En cours', variant: 'default' },
  done: { label: 'Terminé', variant: 'secondary' },
  dormant: { label: 'En veille', variant: 'destructive' },
};

export function FollowupPanel({ apporteurId, apporteurName }: Props) {
  const { data: followups = [], isLoading } = useProspectingFollowups({ apporteurId });
  const createFollowup = useCreateFollowup();
  const updateFollowup = useUpdateFollowup();
  const [showCreate, setShowCreate] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [newAction, setNewAction] = useState('');

  const handleCreate = () => {
    if (!newNote && !newAction) return;
    createFollowup.mutate({
      apporteur_id: apporteurId,
      apporteur_name: apporteurName,
      status: 'todo',
      next_action: newAction || undefined,
      notes: newNote || undefined,
    }, {
      onSuccess: () => {
        setShowCreate(false);
        setNewNote('');
        setNewAction('');
      },
    });
  };

  const handleStatusChange = (followup: ProspectingFollowup, status: string) => {
    updateFollowup.mutate({ id: followup.id, status: status as any });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4" />
            Suivi commercial
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="w-4 h-4 mr-1" /> Nouveau
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showCreate && (
          <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
            <Input placeholder="Prochaine action..." value={newAction} onChange={e => setNewAction(e.target.value)} />
            <Textarea placeholder="Notes..." value={newNote} onChange={e => setNewNote(e.target.value)} rows={2} />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={createFollowup.isPending}>Créer</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>Annuler</Button>
            </div>
          </div>
        )}

        {isLoading && <p className="text-sm text-muted-foreground">Chargement...</p>}

        {followups.length === 0 && !isLoading && !showCreate && (
          <p className="text-sm text-muted-foreground text-center py-4">Aucun suivi enregistré</p>
        )}

        {followups.map(f => {
          const st = STATUS_LABELS[f.status] || STATUS_LABELS.todo;
          return (
            <div key={f.id} className="p-3 border rounded-lg space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Badge variant={st.variant}>{st.label}</Badge>
                <Select value={f.status} onValueChange={v => handleStatusChange(f, v)}>
                  <SelectTrigger className="w-32 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">À faire</SelectItem>
                    <SelectItem value="in_progress">En cours</SelectItem>
                    <SelectItem value="done">Terminé</SelectItem>
                    <SelectItem value="dormant">En veille</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {f.next_action && <p className="text-sm font-medium text-foreground">→ {f.next_action}</p>}
              {f.notes && <p className="text-xs text-muted-foreground">{f.notes}</p>}
              <p className="text-[10px] text-muted-foreground">
                {new Date(f.updated_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
