/**
 * AgencyTeamRightsPanel — Interface N2 pour gérer les modules de ses N1
 * 
 * Le dirigeant voit la liste de ses employés (N1) et peut toggle leurs modules.
 * Les modules affichés sont limités à ceux que le N2 possède lui-même.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveAuth } from '@/hooks/useEffectiveAuth';
import { usePermissions } from '@/contexts/PermissionsContext';
import { TeamMemberModules } from './TeamMemberModules';
import { Users, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface TeamMember {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role_agence: string | null;
}

export function AgencyTeamRightsPanel() {
  const { agencyId } = useEffectiveAuth();
  const { hasModule, isDeployedModule } = usePermissions();
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['agency-n1-team', agencyId],
    queryFn: async () => {
      if (!agencyId) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role_agence')
        .eq('agency_id', agencyId)
        .eq('global_role', 'franchisee_user');
      if (error) throw error;
      return (data ?? []) as TeamMember[];
    },
    enabled: !!agencyId,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            Aucun collaborateur avec un compte utilisateur dans votre agence.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Les droits seront configurables une fois les comptes N1 créés.
          </p>
        </CardContent>
      </Card>
    );
  }

  const roleLabels: Record<string, string> = {
    commercial: 'Commercial(e)',
    administratif: 'Administratif(ve)',
    technicien: 'Technicien(ne)',
    dirigeant: 'Dirigeant(e)',
    externe: 'Externe',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Shield className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Droits de l'équipe</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Gérez les modules accessibles par chaque membre de votre équipe.
        Vous ne pouvez attribuer que les modules auxquels vous avez vous-même accès.
      </p>

      <div className="grid gap-3">
        {members.map((member) => (
          <Card
            key={member.id}
            className={`cursor-pointer transition-all hover:border-primary/50 ${
              selectedMember === member.id ? 'border-primary ring-1 ring-primary/20' : ''
            }`}
            onClick={() => setSelectedMember(selectedMember === member.id ? null : member.id)}
          >
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  {member.first_name} {member.last_name}
                </CardTitle>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {roleLabels[member.role_agence?.toLowerCase() ?? ''] ?? member.role_agence ?? 'N/A'}
                </span>
              </div>
              {member.email && (
                <CardDescription className="text-xs">{member.email}</CardDescription>
              )}
            </CardHeader>

            {selectedMember === member.id && (
              <CardContent className="pt-0 pb-4 px-4">
                <TeamMemberModules
                  userId={member.id}
                  roleAgence={member.role_agence}
                  n2HasModule={hasModule}
                  isDeployedModule={isDeployedModule}
                />
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
