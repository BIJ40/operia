/**
 * P2: Historique des actions sur un ticket
 * Affiche les changements de statut, priorité, assignation, etc.
 */

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { History, User, ArrowRight, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/logger';

interface TicketAction {
  id: string;
  ticket_id: string;
  action_type: string;
  old_value: string | null;
  new_value: string | null;
  performed_by: string | null;
  performed_by_name?: string;
  created_at: string;
}

interface TicketActionHistoryProps {
  ticketId: string;
}

const ACTION_TYPE_LABELS: Record<string, string> = {
  status_change: 'Changement de statut',
  priority_change: 'Changement de priorité',
  assignment: 'Assignation',
  escalation: 'Escalade',
  resolved: 'Résolution',
  reopened: 'Réouverture',
  message_sent: 'Message envoyé',
  created: 'Création',
};

const ACTION_ICONS: Record<string, React.ElementType> = {
  status_change: Clock,
  priority_change: AlertTriangle,
  assignment: User,
  escalation: ArrowRight,
  resolved: CheckCircle2,
  reopened: History,
  created: History,
};

export function TicketActionHistory({ ticketId }: TicketActionHistoryProps) {
  const [actions, setActions] = useState<TicketAction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActionHistory();
  }, [ticketId]);

  const loadActionHistory = async () => {
    setLoading(true);
    
    try {
      // Use raw query to avoid type issues with new table
      const { data, error } = await supabase
        .from('support_ticket_actions' as any)
        .select(`
          id,
          ticket_id,
          action_type,
          old_value,
          new_value,
          performed_by,
          created_at
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false });

      if (error) {
        logError('support', 'Error loading action history', error);
        setActions([]);
      } else if (data) {
        // Fetch performer names separately
        const performerIds = [...new Set((data as any[]).filter(a => a.performed_by).map(a => a.performed_by))];
        let performerMap: Record<string, string> = {};
        
        if (performerIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .in('id', performerIds);
          
          if (profiles) {
            performerMap = profiles.reduce((acc, p) => {
              acc[p.id] = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Utilisateur';
              return acc;
            }, {} as Record<string, string>);
          }
        }

        setActions((data as any[]).map(action => ({
          ...action,
          performed_by_name: action.performed_by 
            ? (performerMap[action.performed_by] || 'Utilisateur') 
            : 'Système',
        })));
      }
    } catch (err) {
      logError('support', 'Error in loadActionHistory', err);
      setActions([]);
    }
    
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Chargement de l'historique...
      </div>
    );
  }

  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="border-t pt-4">
      <Accordion type="single" collapsible>
        <AccordionItem value="actions">
          <AccordionTrigger className="text-sm font-medium">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-blue-500" />
              Historique des actions ({actions.length})
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {actions.map((action) => {
                const Icon = ACTION_ICONS[action.action_type] || History;
                const label = ACTION_TYPE_LABELS[action.action_type] || action.action_type;
                
                return (
                  <div 
                    key={action.id} 
                    className="p-2 bg-muted/50 dark:bg-muted/30 rounded text-sm flex items-start gap-3"
                  >
                    <Icon className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{label}</p>
                      {action.old_value && action.new_value && (
                        <p className="text-xs text-muted-foreground">
                          {action.old_value} → {action.new_value}
                        </p>
                      )}
                      {!action.old_value && action.new_value && (
                        <p className="text-xs text-muted-foreground">
                          → {action.new_value}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Par {action.performed_by_name} • {format(new Date(action.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
