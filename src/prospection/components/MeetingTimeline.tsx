/**
 * MeetingTimeline - Timeline des RDV commerciaux
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Phone, MapPin, Video } from 'lucide-react';
import { useProspectingMeetings, type ProspectingMeeting } from '../hooks/useProspectingMeetings';

interface Props {
  apporteurId: string;
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; label: string }> = {
  call: { icon: Phone, label: 'Appel' },
  onsite: { icon: MapPin, label: 'Sur site' },
  visio: { icon: Video, label: 'Visio' },
};

export function MeetingTimeline({ apporteurId }: Props) {
  const { data: meetings = [], isLoading } = useProspectingMeetings({ apporteurId });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Historique RDV
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-muted-foreground">Chargement...</p>}

        {meetings.length === 0 && !isLoading && (
          <p className="text-sm text-muted-foreground text-center py-4">Aucun RDV enregistré</p>
        )}

        <div className="space-y-3">
          {meetings.map(m => {
            const typeConfig = TYPE_CONFIG[m.meeting_type] || TYPE_CONFIG.call;
            const Icon = typeConfig.icon;
            return (
              <div key={m.id} className="flex gap-3 p-3 border rounded-lg">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px]">{typeConfig.label}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(m.meeting_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  {m.summary && <p className="text-sm text-foreground">{m.summary}</p>}
                  {m.outcomes && <p className="text-xs text-muted-foreground mt-1">Résultat : {m.outcomes}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
