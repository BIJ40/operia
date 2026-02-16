/**
 * MeetingCreateDialog - Création d'un nouveau RDV
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { CalendarPlus } from 'lucide-react';
import { useCreateMeeting } from '../hooks/useProspectingMeetings';

interface Props {
  apporteurId: string;
  apporteurName: string;
}

export function MeetingCreateDialog({ apporteurId, apporteurName }: Props) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'call' | 'onsite' | 'visio'>('call');
  const [date, setDate] = useState('');
  const [summary, setSummary] = useState('');
  const [outcomes, setOutcomes] = useState('');
  const createMeeting = useCreateMeeting();

  const handleSubmit = () => {
    if (!date) return;
    createMeeting.mutate({
      apporteur_id: apporteurId,
      apporteur_name: apporteurName,
      meeting_at: new Date(date).toISOString(),
      meeting_type: type,
      summary: summary || undefined,
      outcomes: outcomes || undefined,
    }, {
      onSuccess: () => {
        setOpen(false);
        setDate('');
        setSummary('');
        setOutcomes('');
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CalendarPlus className="w-4 h-4 mr-1" /> Nouveau RDV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau RDV – {apporteurName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={v => setType(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="call">Appel</SelectItem>
                <SelectItem value="onsite">Sur site</SelectItem>
                <SelectItem value="visio">Visio</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Résumé</Label>
            <Textarea value={summary} onChange={e => setSummary(e.target.value)} rows={3} placeholder="Points abordés..." />
          </div>
          <div className="space-y-2">
            <Label>Résultats / Issues</Label>
            <Textarea value={outcomes} onChange={e => setOutcomes(e.target.value)} rows={2} placeholder="Décisions prises..." />
          </div>
          <Button onClick={handleSubmit} disabled={!date || createMeeting.isPending} className="w-full">
            Enregistrer le RDV
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
