import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, ArrowRight, Clock, User, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { logError } from '@/lib/logger';

interface EscalationRecord {
  ticket_id: string;
  ticket_subject: string;
  ticket_service: string;
  from_level: number;
  to_level: number;
  from_role?: string;
  to_role?: string;
  escalated_by_name: string;
  escalated_to_name: string;
  reason: string;
  timestamp: string;
}

const getSupportLevelLabel = (level: number) => {
  switch (level) {
    case 1: return 'N1 - Aide de base';
    case 2: return 'N2 - Technique';
    case 3: return 'N3 - Développeur';
    default: return `Niveau ${level}`;
  }
};

const getHelpConfortRoleLabel = (role: string) => {
  switch (role) {
    case 'animateur_reseau': return 'Animateur Réseau';
    case 'directeur_reseau': return 'Directeur Réseau';
    case 'dg': return 'Directeur Général';
    default: return role;
  }
};

export default function AdminEscalationHistory() {
  const { hasGlobalRole } = useAuth();
  const navigate = useNavigate();
  const [escalations, setEscalations] = useState<EscalationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // V2: Vérification par rôle global (N5+)
  const canAccess = hasGlobalRole('platform_admin');

  useEffect(() => {
    if (!canAccess) {
      navigate('/');
      return;
    }
    loadEscalations();
  }, [canAccess, navigate]);

  const loadEscalations = async () => {
    setIsLoading(true);
    try {
      const { data: tickets, error } = await supabase
        .from('support_tickets')
        .select('id, subject, service, escalation_history')
        .not('escalation_history', 'is', null)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const allEscalations: EscalationRecord[] = [];
      
      tickets?.forEach(ticket => {
        if (ticket.escalation_history && Array.isArray(ticket.escalation_history)) {
          ticket.escalation_history.forEach((esc: any) => {
            allEscalations.push({
              ticket_id: ticket.id,
              ticket_subject: ticket.subject,
              ticket_service: ticket.service || 'Non défini',
              from_level: esc.from_level || 0,
              to_level: esc.to_level || 0,
              from_role: esc.from_role,
              to_role: esc.to_role,
              escalated_by_name: esc.escalated_by_name || 'Inconnu',
              escalated_to_name: esc.escalated_to_name || 'Non assigné',
              reason: esc.reason || '',
              timestamp: esc.timestamp,
            });
          });
        }
      });

      allEscalations.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setEscalations(allEscalations);
    } catch (error) {
      logError('ADMIN_ESCALATION', 'Erreur chargement escalades', { error });
      toast.error('Impossible de charger l\'historique des escalades');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Historique des Escalades
        </h1>
        <p className="text-muted-foreground">
          Toutes les escalades de tickets effectuées
        </p>
      </div>

      <Card className="rounded-2xl shadow-lg border-l-4 border-l-primary">
        <CardHeader className="bg-muted/30">
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="w-5 h-5" />
            {escalations.length} escalade{escalations.length > 1 ? 's' : ''} enregistrée{escalations.length > 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {escalations.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune escalade enregistrée
            </p>
          ) : (
            <div className="space-y-4">
              {escalations.map((esc, index) => (
                <Card 
                  key={`${esc.ticket_id}-${index}`}
                  className="p-4 hover:shadow-md transition-shadow border-l-4 border-l-primary/20"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {esc.ticket_service}
                        </Badge>
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{esc.ticket_subject}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {format(new Date(esc.timestamp), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pl-6">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-500">
                          {esc.ticket_service === 'HelpConfort' && esc.from_role
                            ? getHelpConfortRoleLabel(esc.from_role)
                            : getSupportLevelLabel(esc.from_level)
                          }
                        </Badge>
                        <ArrowRight className="w-4 h-4 text-primary" />
                        <Badge className="bg-orange-500">
                          {esc.ticket_service === 'HelpConfort' && esc.to_role
                            ? getHelpConfortRoleLabel(esc.to_role)
                            : getSupportLevelLabel(esc.to_level)
                          }
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 pl-6 text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <User className="w-3 h-3" />
                        <span>De : <strong>{esc.escalated_by_name}</strong></span>
                      </div>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <User className="w-3 h-3" />
                        <span>Vers : <strong>{esc.escalated_to_name}</strong></span>
                      </div>
                    </div>

                    {esc.reason && (
                      <div className="pl-6 pt-2 border-t">
                        <p className="text-sm text-muted-foreground">
                          <strong>Motif :</strong> {esc.reason}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
