/**
 * AgencyTeamRightsPanel — Vue tuiles colorées des droits N1
 * 
 * Chaque salarié est affiché comme une tuile compacte avec des chips
 * colorées par domaine représentant ses modules actifs.
 * Cliquer sur une tuile ouvre un dialog de gestion des droits.
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveAuth } from '@/hooks/useEffectiveAuth';
import { usePermissionsBridge as usePermissions } from '@/hooks/usePermissionsBridge';

import { useModuleLabels } from '@/hooks/useModuleLabels';
import { getDelegatableModules } from '@/lib/delegatableModules';
import { TeamMemberModules } from './TeamMemberModules';
import { Users, Shield, Settings2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { ModuleKey } from '@/types/modules';

interface TeamMember {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role_agence: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  commercial: 'Commercial(e)',
  administratif: 'Administratif(ve)',
  technicien: 'Technicien(ne)',
  dirigeant: 'Dirigeant(e)',
  externe: 'Externe',
};

/** Couleurs sémantiques par domaine pour les chips */
const CATEGORY_CHIP_STYLES: Record<string, string> = {
  Pilotage: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  Commercial: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  Organisation: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  Médiathèque: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 border-teal-200 dark:border-teal-800',
  Support: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 border-violet-200 dark:border-violet-800',
};

const CATEGORY_DOT_COLORS: Record<string, string> = {
  Pilotage: 'bg-blue-500',
  Commercial: 'bg-orange-500',
  Organisation: 'bg-emerald-500',
  Médiathèque: 'bg-teal-500',
  Support: 'bg-violet-500',
};

function MemberModuleChips({
  userId,
  n2HasModule,
  isDeployedModule,
}: {
  userId: string;
  n2HasModule: (key: ModuleKey) => boolean;
  isDeployedModule: (key: ModuleKey) => boolean;
}) {
  // V2: modules are resolved via permissions system, not user_modules table
  return (
    <span className="text-xs text-muted-foreground italic">Droits gérés via le système V2</span>
  );
}

export function AgencyTeamRightsPanel() {
  const { agencyId } = useEffectiveAuth();
  const { hasModule, isDeployedModule } = usePermissions();
  const [editMember, setEditMember] = useState<TeamMember | null>(null);

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
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Shield className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Droits de l'équipe</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Cliquez sur un collaborateur pour gérer ses modules.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {members.map(member => {
          const displayName = [member.first_name, member.last_name].filter(Boolean).join(' ') || member.email || 'N/A';
          const roleLabel = ROLE_LABELS[member.role_agence?.toLowerCase() ?? ''] ?? member.role_agence;

          return (
            <Card
              key={member.id}
              className="group cursor-pointer transition-all duration-200 hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 active:scale-[0.98]"
              onClick={() => setEditMember(member)}
            >
              <CardContent className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{displayName}</p>
                    {roleLabel && (
                      <Badge variant="secondary" className="mt-1 text-[10px] font-normal">
                        {roleLabel}
                      </Badge>
                    )}
                  </div>
                  <Settings2 className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                </div>

                {/* Module chips */}
                <MemberModuleChips
                  userId={member.id}
                  n2HasModule={hasModule}
                  isDeployedModule={isDeployedModule}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editMember} onOpenChange={(open) => !open && setEditMember(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              {editMember
                ? `${editMember.first_name ?? ''} ${editMember.last_name ?? ''}`.trim() || editMember.email
                : ''}
            </DialogTitle>
            <DialogDescription>
              Modules accessibles par ce collaborateur. Seuls vos propres modules peuvent être attribués.
            </DialogDescription>
          </DialogHeader>
          {editMember && (
            <TeamMemberModules
              userId={editMember.id}
              roleAgence={editMember.role_agence}
              n2HasModule={hasModule}
              isDeployedModule={isDeployedModule}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
