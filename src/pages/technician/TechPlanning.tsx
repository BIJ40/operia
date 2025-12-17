import { Loader2, Calendar, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { TechWeeklyPlanningList } from '@/apogee-connect/components/TechWeeklyPlanningList';
import { useTechnicianProfile } from '@/hooks/technician/useTechnicianProfile';
import { AgencyProvider } from '@/apogee-connect/contexts/AgencyContext';

export default function TechPlanning() {
  const { data: profile, isLoading: profileLoading } = useTechnicianProfile();

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Aucun profil salarié configuré
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile.apogee_user_id) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="p-6 flex flex-col items-center gap-3 text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 text-amber-500" />
            <div>
              <p className="font-medium text-foreground">Compte non lié à Apogée</p>
              <p className="text-sm mt-1">
                Votre profil n'est pas encore lié à votre compte technicien Apogée.
                Contactez votre responsable pour effectuer cette liaison.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Mon Planning
        </h1>
      </div>

      {/* Planning Apogée filtré pour ce technicien - wrappé dans AgencyProvider */}
      <AgencyProvider>
        <TechWeeklyPlanningList 
          techFilterId={profile.apogee_user_id} 
          isN1View={true}
        />
      </AgencyProvider>
    </div>
  );
}