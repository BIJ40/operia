/**
 * Admin Escalation History - V3
 * Note: Escalation history is now tracked via apogee_ticket_history
 * This page shows historical escalations from legacy support_tickets (deprecated)
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { ArrowRight, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AdminEscalationHistory() {
  const { hasGlobalRole } = useAuth();
  const navigate = useNavigate();
  
  const canAccess = hasGlobalRole('platform_admin');

  useEffect(() => {
    if (!canAccess) {
      navigate('/');
    }
  }, [canAccess, navigate]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Historique des Escalades
        </h1>
        <p className="text-muted-foreground">
          Suivi des transitions de tickets
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Les escalades sont maintenant gérées via le système de tickets projet (Kanban).
          Consultez l'historique des tickets dans le module Gestion de Projet.
        </AlertDescription>
      </Alert>

      <Card className="rounded-2xl shadow-lg border-l-4 border-l-primary">
        <CardHeader className="bg-muted/30">
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="w-5 h-5" />
            Système V3 - Historique via Kanban
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground py-8">
            L'historique des escalades est désormais intégré à chaque ticket projet.
            <br />
            Accédez au détail d'un ticket pour voir son historique complet.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
