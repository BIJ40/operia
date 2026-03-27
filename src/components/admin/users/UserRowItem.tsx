import { memo, useState } from 'react';
import { GlobalRole, getAllRolesSorted } from '@/types/globalRoles';
import { VISIBLE_ROLE_LABELS, VISIBLE_ROLE_COLORS } from '@/lib/visibleRoleLabels';
import { EnabledModules, ModuleKey } from '@/types/modules';
import { UserProfile } from '@/hooks/use-user-management';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Pencil, UserX, UserCheck, Trash2, AlertCircle, Eye, ChevronDown } from 'lucide-react';
import { UserProfileSheet } from './UserProfileSheet';

import { ROLE_AGENCE_LABELS } from './user-full-dialog/constants';

interface UserRowItemProps {
  user: UserProfile;
  effectiveRole: GlobalRole | null;
  effectiveModules: EnabledModules;
  isModified: boolean;
  canEdit: boolean;
  canDeactivate: boolean;
  canDelete: boolean;
  isSuperAdmin: boolean;
  assignableRoles: GlobalRole[];
  isSaving: boolean;
  onSaveChanges: () => void;
  onRoleChange: (role: GlobalRole) => void;
  onModuleToggle: (moduleKey: ModuleKey, enabled: boolean) => void;
  onModuleOptionToggle: (moduleKey: ModuleKey, optionKey: string, enabled: boolean) => void;
  onEditUser: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
  onDelete: () => void;
  agencyLabelsMap?: Map<string, string>;
}

export const UserRowItem = memo(function UserRowItem({
  user,
  effectiveRole,
  effectiveModules,
  isModified,
  canEdit,
  canDeactivate,
  canDelete,
  isSuperAdmin,
  assignableRoles,
  isSaving,
  onSaveChanges,
  onRoleChange,
  onModuleToggle,
  onModuleOptionToggle,
  onEditUser,
  onDeactivate,
  onReactivate,
  onDelete,
  agencyLabelsMap,
}: UserRowItemProps) {
  const isDeactivated = user.is_active === false;
  const [profileOpen, setProfileOpen] = useState(false);

  const getInitials = () => {
    const first = user.first_name?.[0] || '';
    const last = user.last_name?.[0] || '';
    return (first + last).toUpperCase() || user.email?.[0]?.toUpperCase() || '?';
  };

  const getDisplayName = () => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return 'Sans nom';
  };

  // Filtrer les rôles assignables pour le dropdown
  const filteredRoles = getAllRolesSorted().filter(role => assignableRoles.includes(role));

  return (
    <>
      <div className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors ${isDeactivated ? 'opacity-60 bg-muted/20' : ''}`}>
        {/* Avatar */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium shrink-0 ${isDeactivated ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
          {getInitials()}
        </div>
        
        {/* User Info */}
        <div className="w-44 shrink-0 min-w-0">
          <div className="font-medium truncate">{getDisplayName()}</div>
          <div className="text-sm text-muted-foreground truncate">{user.email || 'Pas d\'email'}</div>
        </div>

        {/* Agency */}
        <div className="hidden md:block w-24 shrink-0 text-sm text-muted-foreground truncate">
          {user.agencyLabel || agencyLabelsMap?.get(user.agence || '') || user.agence || 'Sans agence'}
        </div>

        {/* Poste */}
        <div className="hidden lg:block w-24 shrink-0 text-sm text-muted-foreground truncate">
          {ROLE_AGENCE_LABELS[user.role_agence || ''] || user.role_agence || '-'}
        </div>

        {/* Global Role - Dropdown cliquable */}
        <div className="w-44 shrink-0">
          {canEdit && filteredRoles.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer group">
                  {effectiveRole ? (
                    <Badge className={`${VISIBLE_ROLE_COLORS[effectiveRole] || 'bg-muted'} text-xs pr-1.5`}>
                      {VISIBLE_ROLE_LABELS[effectiveRole]}
                      <ChevronDown className="w-3 h-3 ml-1 opacity-60 group-hover:opacity-100" />
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground text-xs pr-1.5">
                      Non défini
                      <ChevronDown className="w-3 h-3 ml-1 opacity-60" />
                    </Badge>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-background z-50">
                {filteredRoles.map(role => (
                  <DropdownMenuItem 
                    key={role} 
                    onClick={() => onRoleChange(role)}
                    className={effectiveRole === role ? 'bg-accent' : ''}
                  >
                    <Badge className={`${VISIBLE_ROLE_COLORS[role] || 'bg-muted'} text-xs mr-2`}>
                      {VISIBLE_ROLE_LABELS[role]}
                    </Badge>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            effectiveRole ? (
              <Badge className={`${VISIBLE_ROLE_COLORS[effectiveRole] || 'bg-muted'} text-xs`}>
                {VISIBLE_ROLE_LABELS[effectiveRole]}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground text-xs">Non défini</Badge>
            )
          )}
        </div>

        {/* Badges - Statuts */}
        <div className="w-36 shrink-0 flex items-center gap-1 flex-wrap">
          {isModified && (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs">
              Modifié
            </Badge>
          )}

          {isDeactivated && (
            <Badge variant="destructive" className="text-xs">
              <UserX className="w-3 h-3 mr-1" />
              Désactivé
            </Badge>
          )}

          {user.must_change_password && !isDeactivated && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/30 text-xs">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  MDP
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                L'utilisateur n'a pas encore changé son mot de passe provisoire
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Actions - Icônes */}
        <div className="flex items-center gap-1 shrink-0 ml-auto">
          {canEdit ? (
            <>
              {/* Modifier */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEditUser}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Modifier les informations</TooltipContent>
              </Tooltip>

              {/* Fiche utilisateur */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setProfileOpen(true)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Fiche utilisateur</TooltipContent>
              </Tooltip>

              {/* Désactiver / Réactiver */}
              {!isDeactivated ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50" onClick={onDeactivate}>
                      <UserX className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Désactiver l'utilisateur</TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={onReactivate}>
                      <UserCheck className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Réactiver l'utilisateur</TooltipContent>
                </Tooltip>
              )}

              {/* Supprimer */}
              {canDelete && isSuperAdmin && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={onDelete}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Supprimer définitivement</TooltipContent>
                </Tooltip>
              )}
            </>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-muted-foreground text-xs">Lecture seule</Badge>
              </TooltipTrigger>
              <TooltipContent>
                Vous ne pouvez pas modifier cet utilisateur
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* User Profile Sheet */}
      <UserProfileSheet
        open={profileOpen}
        onOpenChange={setProfileOpen}
        user={user}
        effectiveRole={effectiveRole}
        effectiveModules={effectiveModules}
        agencyLabel={user.agencyLabel || agencyLabelsMap?.get(user.agence || '')}
      />
    </>
  );
});
