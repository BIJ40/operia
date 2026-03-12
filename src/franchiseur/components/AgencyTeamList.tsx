/**
 * AgencyTeamList — Liste unifiée de l'équipe d'une agence
 * Affiche les utilisateurs inscrits ET les collaborateurs non inscrits
 * avec badge "Non inscrit" et bouton pour créer le compte.
 */

import { memo } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Users, UserPlus, UserCheck } from 'lucide-react';
import { VISIBLE_ROLE_LABELS } from '@/lib/visibleRoleLabels';
import { motion } from 'framer-motion';
import type { AgencyTeamMember } from '@/franchiseur/hooks/useAgencyFullTeam';

interface AgencyTeamListProps {
  members: AgencyTeamMember[];
  isLoading: boolean;
  /** Compact mode (for side panel) */
  compact?: boolean;
  /** Called when "Créer le compte" is clicked on a non-registered collaborator */
  onCreateUser?: (member: AgencyTeamMember) => void;
}

export const AgencyTeamList = memo(function AgencyTeamList({
  members,
  isLoading,
  compact = false,
  onCreateUser,
}: AgencyTeamListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p className="text-sm">Aucun membre dans l'équipe</p>
      </div>
    );
  }

  const registeredCount = members.filter(m => m.is_registered).length;
  const unregisteredCount = members.length - registeredCount;

  return (
    <div className="space-y-3">
      {/* Summary badges */}
      <div className="flex items-center gap-2 text-xs">
        <Badge variant="outline" className="gap-1">
          <UserCheck className="h-3 w-3" />
          {registeredCount} inscrit{registeredCount > 1 ? 's' : ''}
        </Badge>
        {unregisteredCount > 0 && (
          <Badge variant="secondary" className="gap-1">
            <Users className="h-3 w-3" />
            {unregisteredCount} non inscrit{unregisteredCount > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Members list */}
      <div className="space-y-2">
        {members.map((member) => (
          <motion.div
            key={member.id}
            whileHover={{ x: compact ? 4 : 0 }}
            className={`flex items-center justify-between rounded-xl transition-all ${
              compact
                ? 'p-3 bg-muted/30 hover:bg-muted/50'
                : 'p-3 rounded-lg border bg-card hover:bg-accent/5'
            } ${!member.is_active ? 'opacity-60' : ''}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className={compact ? 'h-9 w-9' : 'h-10 w-10'}>
                <AvatarFallback
                  className={
                    member.is_registered
                      ? compact
                        ? 'bg-gradient-to-br from-violet-500 to-purple-500 text-white text-xs'
                        : 'bg-primary/10 text-sm'
                      : 'bg-muted text-muted-foreground text-xs'
                  }
                >
                  {member.first_name?.[0]}{member.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className={`font-medium truncate ${compact ? 'text-sm' : ''}`}>
                  {member.first_name} {member.last_name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {member.email || 'Pas d\'email'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
              {member.role && (
                <Badge variant="outline" className="text-xs whitespace-nowrap">
                  {member.role}
                </Badge>
              )}

              {member.is_registered ? (
                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-xs whitespace-nowrap">
                  Inscrit
                </Badge>
              ) : (
                <>
                  <Badge variant="secondary" className="text-xs whitespace-nowrap text-amber-700 bg-amber-100">
                    Non inscrit
                  </Badge>
                  {onCreateUser && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs gap-1 text-primary hover:text-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateUser(member);
                      }}
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Créer le compte</span>
                    </Button>
                  )}
                </>
              )}

              {!compact && member.global_role && member.is_registered && (
                <Badge variant="secondary" className="text-xs whitespace-nowrap">
                  {VISIBLE_ROLE_LABELS[member.global_role as keyof typeof VISIBLE_ROLE_LABELS] || member.global_role}
                </Badge>
              )}

              {!member.is_active && (
                <Badge variant="destructive" className="text-xs">Inactif</Badge>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
});
