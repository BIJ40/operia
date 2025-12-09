/**
 * Page Historique des tickets Gestion de Projet
 * Accessible à tous les utilisateurs du module
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, History, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTicketHistory } from '../hooks/useTicketPermissions';
import { useApogeeTickets } from '../hooks/useApogeeTickets';
import { ROUTES } from '@/config/routes';

export default function ApogeeTicketsHistoryPage() {
  const { data: history, isLoading } = useTicketHistory('');
  const { statuses, tickets } = useApogeeTickets();
  
  const getStatusLabel = (id: string) => {
    return statuses?.find(s => s.id === id)?.label || id;
  };
  
  const getActionLabel = (action: string) => {
    switch (action) {
      case 'status_change': return 'Changement de statut';
      case 'comment_added': return 'Commentaire ajouté';
      case 'created': return 'Ticket créé';
      case 'priority_change': return 'Changement de priorité';
      case 'module_change': return 'Changement de module';
      case 'merged': return 'Fusion de tickets';
      default: return action;
    }
  };

  const getTicketRef = (ticketId: string) => {
    const ticket = tickets?.find(t => t.id === ticketId);
    const num = ticket?.ticket_number || 0;
    return `APO-${String(num).padStart(3, '0')}`;
  };

  const getTicketTitle = (ticketId: string) => {
    const ticket = tickets?.find(t => t.id === ticketId);
    return ticket?.element_concerne || '';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link to={ROUTES.projects.kanban}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kanban
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Historique</h1>
          <p className="text-muted-foreground">Traçabilité complète des actions sur les tickets</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historique des Actions
          </CardTitle>
          <CardDescription>
            Les 100 dernières actions effectuées sur les tickets.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Chargement de l'historique...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Détails</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Aucun historique disponible
                    </TableCell>
                  </TableRow>
                ) : (
                  history?.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {format(new Date(entry.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-mono text-xs font-semibold text-primary">
                            {getTicketRef(entry.ticket_id)}
                          </div>
                          <div className="text-xs text-muted-foreground truncate max-w-[150px]" title={getTicketTitle(entry.ticket_id)}>
                            {getTicketTitle(entry.ticket_id)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{entry.user_name || '-'}</div>
                          <div className="text-xs text-muted-foreground">{entry.user_email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getActionLabel(entry.action_type)}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {entry.action_type === 'status_change' && entry.old_value && entry.new_value && (
                          <span>
                            {getStatusLabel(entry.old_value)} → {getStatusLabel(entry.new_value)}
                          </span>
                        )}
                        {entry.action_type === 'comment_added' && (
                          <span className="text-muted-foreground">Nouveau commentaire</span>
                        )}
                        {entry.action_type === 'priority_change' && entry.old_value && entry.new_value && (
                          <span>
                            Priorité {entry.old_value} → {entry.new_value}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
