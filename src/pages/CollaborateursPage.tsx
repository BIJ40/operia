/**
 * Page de gestion des collaborateurs (Module RH & Parc)
 */

import { useState } from 'react';
import { useCollaborators } from '@/hooks/useCollaborators';
import { CollaboratorList, CollaboratorForm } from '@/components/collaborators';
import { CollaboratorFormData } from '@/types/collaborator';

export default function CollaborateursPage() {
  const {
    collaborators,
    isLoading,
    canManage,
    createMutation,
  } = useCollaborators();

  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const handleCreate = (data: CollaboratorFormData) => {
    createMutation.mutate(data, {
      onSuccess: () => setShowCreateDialog(false),
    });
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <CollaboratorList
        collaborators={collaborators}
        isLoading={isLoading}
        canManage={canManage}
        onCreateClick={() => setShowCreateDialog(true)}
      />

      <CollaboratorForm
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreate}
        isPending={createMutation.isPending}
        mode="create"
      />
    </div>
  );
}
