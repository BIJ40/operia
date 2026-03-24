/**
 * Page Historique des tickets Gestion de Projet
 * Affiche les dernières modifications sur tous les tickets (contenu fusionné du RecentChangesSheet)
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowRight, MessageSquare, Edit, Plus, Clock, User, History } from 'lucide-react';
import { useApogeeTickets } from '../hooks/useApogeeTickets';
import { TicketDetailDrawer } from '../components/TicketDetailDrawer';
import type { ApogeeTicket } from '../types';

interface ApogeeTicketsHistoryPageProps {
  embedded?: boolean;
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

const LIMIT_OPTIONS = [25, 50, 100, 200];

const ACTION_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  status_change: { 
    icon: <ArrowRight className="h-3 w-3" />, 
    label: 'Statut modifié',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
  },
  comment_added: { 
    icon: <MessageSquare className="h-3 w-3" />, 
    label: 'Commentaire',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
  },
  field_update: { 
    icon: <Edit className="h-3 w-3" />, 
    label: 'Modification',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
  },
  created: { 
    icon: <Plus className="h-3 w-3" />, 
    label: 'Création',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
  },
  viewed_by_support: { 
    icon: <User className="h-3 w-3" />, 
    label: 'Vu par le support',
    color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300'
  },
  priority_change: { 
    icon: <Edit className="h-3 w-3" />, 
    label: 'Priorité modifiée',
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
  },
  module_change: { 
    icon: <Edit className="h-3 w-3" />, 
    label: 'Module modifié',
    color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
  },
  merged: { 
    icon: <Edit className="h-3 w-3" />, 
    label: 'Fusion de tickets',
    color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300'
  },
};

export default function ApogeeTicketsHistoryPage({ embedded = false }: ApogeeTicketsHistoryPageProps) {
  const [limit, setLimit] = useState(50);
  const [selectedTicket, setSelectedTicket] = useState<ApogeeTicket | null>(null);
  
  const { tickets, statuses, modules, priorities, updateTicket, deleteTicket } = useApogeeTickets();

  // Fetch recent history across all tickets
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['all-ticket-history-page', limit],
    queryFn: async () => {
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
  });

  const getStatusLabel = (id: string) => statuses?.find(s => s.id === id)?.label || id;
  const getModuleLabel = (id: string) => modules?.find(m => m.id === id)?.label || id;

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
    const ticket = tickets?.find(t => t.id === ticketId);
    if (ticket) {
      setSelectedTicket(ticket);
    }
  };

  return (
    <div className={embedded ? "space-y-4" : "container mx-auto max-w-app py-8 px-4 space-y-6"}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Dernières modifications
              </CardTitle>
              <CardDescription>
                Historique des actions récentes sur tous les tickets
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
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
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Chargement de l'historique...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Aucune modification récente
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
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

                        {entry.action_type === 'viewed_by_support' && entry.new_value && (
                          <p className="text-xs text-cyan-600 dark:text-cyan-400 mt-1">
                            Vu par {entry.new_value}
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
        </CardContent>
      </Card>

      {/* Ticket Detail Drawer */}
      <TicketDetailDrawer
        ticket={selectedTicket}
        open={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        onUpdate={(updates) => updateTicket.mutate(updates)}
        onDelete={(id) => deleteTicket.mutate(id)}
        statuses={statuses || []}
        modules={modules || []}
        priorities={priorities || []}
      />
    </div>
  );
}
