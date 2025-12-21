/**
 * Page de gestion des collaborateurs (Module RH & Parc)
 * Crée un utilisateur portail (auth + profile) qui devient automatiquement un collaborateur
 */

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAgencyTeamMembers } from '@/hooks/useAgencyTeamMembers';
import { useUserManagement } from '@/hooks/use-user-management';
import { useAdminAgencies } from '@/hooks/use-admin-agencies';
import { useAuth } from '@/contexts/AuthContext';
import { CollaboratorList } from '@/components/collaborators';
import { CreateUserDialog } from '@/components/admin/users';
import { GlobalRole, getRoleLevel } from '@/types/globalRoles';
import { PageHeader } from '@/components/layout/PageHeader';
import { ROUTES } from '@/config/routes';
import { getUserManagementCapabilities } from '@/config/roleMatrix';

export default function CollaborateursPage() {
  const queryClient = useQueryClient();
  const { agence, agencyId, globalRole } = useAuth();
  
  // Use profiles as source of truth (only users with accounts)
  const {
    collaborators,
    isLoading,
    canManage,
  } = useAgencyTeamMembers();

  // Hook de gestion utilisateurs pour la création via edge function
  const { createUserMutation } = useUserManagement({ scope: 'ownAgency' });
  
  // Récupération des agences (on n'utilisera que l'agence courante pour le pré-remplissage)
  const { data: agencies = [] } = useAdminAgencies();

  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Calcul des rôles assignables et du niveau du créateur
  const currentUserLevel = getRoleLevel(globalRole);
  const capabilities = getUserManagementCapabilities(globalRole);
  const assignableRoles = capabilities.canCreateRoles;

  // Handler de création qui invalide les collaborateurs après succès
  const handleCreate = async (data: { 
    email: string; 
    password: string; 
    firstName: string; 
    lastName: string; 
    agence: string; 
    roleAgence: string;
    globalRole: GlobalRole; 
    sendEmail: boolean;
  }) => {
    await createUserMutation.mutateAsync(data, {
      onSuccess: () => {
        setShowCreateDialog(false);
        // Petit délai pour laisser le trigger auto_create_collaborator s'exécuter côté DB
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['collaborators', agencyId] });
        }, 500);
      },
    });
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <PageHeader
        title="Mon équipe"
        subtitle="Gestion des collaborateurs de l'agence"
        backTo={ROUTES.rh.index}
        backLabel="Espace RH"
      />
      <CollaboratorList
        collaborators={collaborators}
        isLoading={isLoading}
        canManage={canManage}
        onCreateClick={() => setShowCreateDialog(true)}
      />

      {/* Dialog de création d'utilisateur - mode agence : forceOwnAgency + agencyMode */}
      <CreateUserDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreate}
        isPending={createUserMutation.isPending}
        assignableRoles={assignableRoles}
        agencies={agencies}
        currentUserLevel={currentUserLevel}
        currentUserAgency={agence}
        forceOwnAgency={true}
        agencyMode={true}
      />
    </div>
  );
}
