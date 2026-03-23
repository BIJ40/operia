/**
 * Page profil 360° d'un collaborateur
 */

import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useCollaborator, useCollaborators } from '@/hooks/useCollaborators';
import { CollaboratorProfile, CollaboratorForm } from '@/components/collaborators';
import { CollaboratorFormData } from '@/types/collaborator';
import { CollaboratorTab } from '@/types/collaborator';
import { Skeleton } from '@/components/ui/skeleton';

export default function CollaborateurProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTab = (searchParams.get('tab') as CollaboratorTab) || 'identity';
  
  const { data: collaborator, isLoading } = useCollaborator(id);
  const { updateMutation, deleteMutation, canManage } = useCollaborators();

  const [showEditDialog, setShowEditDialog] = useState(false);

  const handleUpdate = (data: CollaboratorFormData) => {
    if (!id) return;
    updateMutation.mutate(
      { id, data },
      { onSuccess: () => setShowEditDialog(false) }
    );
  };

  const handleDelete = () => {
    if (!id) return;
    deleteMutation.mutate(id, {
      onSuccess: () => navigate('/rh/suivi'),
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-7xl py-8 px-4 space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-10 w-full" />
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!collaborator) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Collaborateur non trouvé</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <CollaboratorProfile
        collaborator={collaborator}
        canManage={canManage}
        onEdit={() => setShowEditDialog(true)}
        onDelete={handleDelete}
        isDeleting={deleteMutation.isPending}
        defaultTab={defaultTab}
      />

      <CollaboratorForm
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSubmit={handleUpdate}
        isPending={updateMutation.isPending}
        collaborator={collaborator}
        mode="edit"
      />
    </div>
  );
}
