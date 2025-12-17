import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  Clock, 
  LogOut,
  Loader2 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useTechnicianProfile } from '@/hooks/technician/useTechnicianProfile';
import { useAuth } from '@/contexts/AuthContext';

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
}

export default function TechProfil() {
  const { data: profile, isLoading } = useTechnicianProfile();
  const { logout, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-4 space-y-4">
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Aucun profil salarié configuré
          </CardContent>
        </Card>
        <Button
          variant="destructive"
          className="w-full"
          onClick={() => logout()}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Se déconnecter
        </Button>
      </div>
    );
  }

  const workProfile = profile.work_profile;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          Mon Profil
        </h1>
      </div>

      {/* Profile info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Informations personnelles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-semibold text-primary">
                {profile.first_name?.[0]}{profile.last_name?.[0]}
              </span>
            </div>
            <div>
              <div className="font-semibold text-lg">
                {profile.first_name} {profile.last_name}
              </div>
              <div className="text-sm text-muted-foreground">Technicien</div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{profile.email || user?.email || '-'}</span>
            </div>
            {profile.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{profile.phone}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Work profile */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Contrat de travail</CardTitle>
        </CardHeader>
        <CardContent>
          {workProfile ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Durée hebdomadaire
                </div>
                <span className="font-medium">
                  {formatMinutes(workProfile.weekly_contract_minutes)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Pause par défaut
                </div>
                <span className="font-medium">
                  {workProfile.break_minutes_default} min
                </span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-2">
              Aucune configuration de contrat
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logout */}
      <Button
        variant="outline"
        className="w-full"
        onClick={() => logout()}
      >
        <LogOut className="h-4 w-4 mr-2" />
        Se déconnecter
      </Button>
    </div>
  );
}
