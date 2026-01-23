/**
 * Onglet Timeline - Historique complet des actions sur un ticket
 */

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRight, 
  MessageSquare, 
  Edit, 
  Plus, 
  Sparkles,
  User,
  Clock
} from 'lucide-react';
import { useTicketHistory } from '../hooks/useTicketPermissions';
import type { ApogeeTicketStatus } from '../types';

interface TicketTimelineTabProps {
  ticketId: string;
  statuses: ApogeeTicketStatus[];
}

const ACTION_TYPE_CONFIG: Record<string, { 
  icon: React.ReactNode; 
  label: string; 
  color: string 
}> = {
  status_change: { 
    icon: <ArrowRight className="h-4 w-4" />, 
    label: 'Changement de statut',
    color: 'bg-blue-100 text-blue-700 border-blue-200'
  },
  comment_added: { 
    icon: <MessageSquare className="h-4 w-4" />, 
    label: 'Commentaire ajouté',
    color: 'bg-green-100 text-green-700 border-green-200'
  },
  field_update: { 
    icon: <Edit className="h-4 w-4" />, 
    label: 'Modification',
    color: 'bg-amber-100 text-amber-700 border-amber-200'
  },
  created: { 
    icon: <Plus className="h-4 w-4" />, 
    label: 'Création',
    color: 'bg-purple-100 text-purple-700 border-purple-200'
  },
  qualified: { 
    icon: <Sparkles className="h-4 w-4" />, 
    label: 'Qualification IA',
    color: 'bg-violet-100 text-violet-700 border-violet-200'
  },
  viewed_by_support: { 
    icon: <User className="h-4 w-4" />, 
    label: 'Vu par le support',
    color: 'bg-cyan-100 text-cyan-700 border-cyan-200'
  },
};

export function TicketTimelineTab({ ticketId, statuses }: TicketTimelineTabProps) {
  const { data: history = [], isLoading } = useTicketHistory(ticketId);

  const getStatusLabel = (statusId: string): string => {
    const status = statuses.find(s => s.id === statusId);
    return status?.label || statusId;
  };

  const getConfig = (actionType: string) => {
    return ACTION_TYPE_CONFIG[actionType] || {
      icon: <Clock className="h-4 w-4" />,
      label: actionType,
      color: 'bg-muted text-muted-foreground border-border'
    };
  };

  const formatValue = (actionType: string, value: string | null, isOld: boolean): string => {
    if (!value) return '—';
    
    if (actionType === 'status_change') {
      return getStatusLabel(value);
    }
    
    return value;
  };

  return (
    <TabsContent value="timeline" className="flex-1 overflow-hidden m-0">
      <ScrollArea className="h-full">
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Chargement de l'historique...
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun historique disponible
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                {history.length} action{history.length > 1 ? 's' : ''} enregistrée{history.length > 1 ? 's' : ''}
              </p>
              
              <div className="relative">
                {/* Ligne verticale de timeline */}
                <div className="absolute left-[19px] top-3 bottom-3 w-0.5 bg-border" />
                
                <div className="space-y-4">
                  {history.map((entry) => {
                    const config = getConfig(entry.action_type);
                    
                    return (
                      <div key={entry.id} className="relative flex gap-4">
                        {/* Point de la timeline */}
                        <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${config.color}`}>
                          {config.icon}
                        </div>
                        
                        {/* Contenu */}
                        <div className="flex-1 min-w-0 pb-4">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-sm">
                                {entry.action_type === 'field_update' && entry.metadata
                                  ? `${(entry.metadata as { fieldLabel?: string }).fieldLabel || (entry.metadata as { field?: string }).field || 'Champ'} modifié`
                                  : config.label
                                }
                              </p>
                              
                              {/* Détails de l'action */}
                              {entry.action_type === 'status_change' && (
                                <div className="flex items-center gap-2 mt-1 text-sm">
                                  <Badge variant="outline" className="font-normal">
                                    {formatValue(entry.action_type, entry.old_value, true)}
                                  </Badge>
                                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                  <Badge variant="secondary" className="font-semibold">
                                    {formatValue(entry.action_type, entry.new_value, false)}
                                  </Badge>
                                </div>
                              )}
                              
                              {entry.action_type === 'field_update' && (entry.old_value || entry.new_value) && (
                                <div className="flex items-center gap-2 mt-1 text-sm flex-wrap">
                                  {entry.old_value && (
                                    <>
                                      <Badge variant="outline" className="font-normal text-xs">
                                        {entry.old_value}
                                      </Badge>
                                      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                    </>
                                  )}
                                  <Badge variant="secondary" className="font-semibold text-xs">
                                    {entry.new_value || '(vide)'}
                                  </Badge>
                                </div>
                              )}
                              
                              {entry.action_type === 'comment_added' && entry.new_value && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  "{entry.new_value}"
                                </p>
                              )}
                              
                              {entry.action_type === 'viewed_by_support' && entry.new_value && (
                                <p className="text-sm text-cyan-700 mt-1">
                                  Vu par {entry.new_value}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {/* Métadonnées */}
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {entry.user_name || entry.user_email || 'Utilisateur'}
                            </span>
                            <span>
                              {format(new Date(entry.created_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </TabsContent>
  );
}
