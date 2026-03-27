/**
 * Sheet affichant les dernières modifications sur les tickets
 */

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowRight, MessageSquare, Edit, Plus, Clock, User } from 'lucide-react';
import type { ApogeeTicket, ApogeeTicketStatus, ApogeeModule } from '../types';

interface RecentChangesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tickets: ApogeeTicket[];
  statuses: ApogeeTicketStatus[];
  modules: ApogeeModule[];
  onTicketClick: (ticket: ApogeeTicket) => void;
}

interface HistoryEntry {
  id: string;
  ticket_id: string;
  action_type: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
  user_name?: string;
  user_email?: string;
  ticket_number?: number;
  ticket_title?: string;
}

const LIMIT_OPTIONS = [10, 25, 50, 100];

const ACTION_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  status_change: { 
    icon: <ArrowRight className="h-3 w-3" />, 
    label: 'Statut modifié',
    color: 'bg-blue-100 text-blue-700'
  },
  comment_added: { 
    icon: <MessageSquare className="h-3 w-3" />, 
    label: 'Commentaire',
    color: 'bg-green-100 text-green-700'
  },
  field_update: { 
    icon: <Edit className="h-3 w-3" />, 
    label: 'Modification',
    color: 'bg-amber-100 text-amber-700'
  },
  created: { 
    icon: <Plus className="h-3 w-3" />, 
    label: 'Création',
    color: 'bg-purple-100 text-purple-700'
  },
  viewed_by_support: { 
    icon: <User className="h-3 w-3" />, 
    label: 'Vu par le support',
    color: 'bg-cyan-100 text-cyan-700'
  },
};

export function RecentChangesSheet({ 
  open, 
  onOpenChange, 
  tickets, 
  statuses, 
  modules,
  onTicketClick 
}: RecentChangesSheetProps) {
  const [limit, setLimit] = useState(25);

  // Fetch recent history across all tickets
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['all-ticket-history', limit],
    queryFn: async () => {
      // Fetch history entries
      const { data: historyData, error } = await supabase
        .from('apogee_ticket_history')
        .select(`
          id,
          ticket_id,
          action_type,
          old_value,
          new_value,
          created_at,
          metadata,
          user_id
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      if (!historyData || historyData.length === 0) return [];

      // Get unique user IDs
      const userIds = [...new Set(historyData.map(h => h.user_id).filter(Boolean))];
      
      // Fetch user profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Get unique ticket IDs
      const ticketIds = [...new Set(historyData.map(h => h.ticket_id))];
      
      // Fetch ticket info
      const { data: ticketsData } = await supabase
        .from('apogee_tickets')
        .select('id, ticket_number, element_concerne')
        .in('id', ticketIds);

      const ticketsMap = new Map(ticketsData?.map(t => [t.id, t]) || []);

      // Combine data
      return historyData.map(entry => {
        const profile = profilesMap.get(entry.user_id);
        const ticket = ticketsMap.get(entry.ticket_id);
        return {
          ...entry,
          user_name: profile ? `${profile.first_name} ${profile.last_name}` : undefined,
          user_email: profile?.email,
          ticket_number: ticket?.ticket_number,
          ticket_title: ticket?.element_concerne,
        } as HistoryEntry;
      });
    },
    enabled: open,
    refetchOnWindowFocus: false,
  });

  const getStatusLabel = (id: string) => statuses.find(s => s.id === id)?.label || id;
  const getModuleLabel = (id: string) => modules.find(m => m.id === id)?.label || id;

  const formatFieldValue = (entry: HistoryEntry, value: string | null): string => {
    if (!value) return '—';
    
    const field = (entry.metadata as { field?: string })?.field;
    
    if (entry.action_type === 'status_change' || field === 'kanban_status') {
      return getStatusLabel(value);
    }
    if (field === 'module') {
      return getModuleLabel(value);
    }
    
    return value;
  };

  const getConfig = (actionType: string) => {
    return ACTION_CONFIG[actionType] || {
      icon: <Clock className="h-3 w-3" />,
      label: actionType,
      color: 'bg-muted text-muted-foreground'
    };
  };

  const handleItemClick = (ticketId: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket) {
      onTicketClick(ticket);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Dernières modifications
          </DialogTitle>
          <DialogDescription>
            Historique des actions récentes sur tous les tickets
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 mb-2 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Afficher :</span>
          <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
            <SelectTrigger className="w-24 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LIMIT_OPTIONS.map(opt => (
                <SelectItem key={opt} value={String(opt)}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">entrées</span>
        </div>

        <ScrollArea className="flex-1 pr-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm">Chargement...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune modification récente
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((entry) => {
                const config = getConfig(entry.action_type);
                const fieldLabel = (entry.metadata as { fieldLabel?: string })?.fieldLabel || 
                                   (entry.metadata as { field?: string })?.field;

                return (
                  <div
                    key={entry.id}
                    onClick={() => handleItemClick(entry.ticket_id)}
                    className="p-3 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`shrink-0 p-1.5 rounded-full ${config.color}`}>
                        {config.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Ticket reference */}
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs font-mono">
                            APO-{String(entry.ticket_number || 0).padStart(3, '0')}
                          </Badge>
                          <span className="text-xs text-muted-foreground truncate flex-1">
                            {entry.ticket_title}
                          </span>
                        </div>

                        {/* Action description */}
                        <p className="text-sm font-medium">
                          {entry.action_type === 'field_update' && fieldLabel
                            ? `${fieldLabel} modifié`
                            : config.label}
                        </p>

                        {/* Change details */}
                        {(entry.action_type === 'status_change' || entry.action_type === 'field_update') && (
                          <div className="flex items-center gap-1.5 mt-1 text-xs flex-wrap">
                            {entry.old_value && (
                              <>
                                <Badge variant="outline" className="font-normal text-xs">
                                  {formatFieldValue(entry, entry.old_value)}
                                </Badge>
                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              </>
                            )}
                            <Badge variant="secondary" className="font-semibold text-xs">
                              {formatFieldValue(entry, entry.new_value)}
                            </Badge>
                          </div>
                        )}

                        {entry.action_type === 'comment_added' && entry.new_value && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            "{entry.new_value}"
                          </p>
                        )}

                        {/* Metadata */}
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <span>{entry.user_name || 'Utilisateur'}</span>
                          <span>•</span>
                          <span>
                            {format(new Date(entry.created_at), "dd MMM 'à' HH:mm", { locale: fr })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
