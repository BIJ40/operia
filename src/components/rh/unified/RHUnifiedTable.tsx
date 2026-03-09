import React, { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { RHCollaborator } from '@/types/rh-suivi';
import { RHUnifiedTableHeader } from './RHUnifiedTableHeader';
import { RHUnifiedTableRow } from './RHUnifiedTableRow';
import { RHUnifiedTabs } from './RHUnifiedTabs';
import { RHStatsHeader } from './RHStatsHeader';
import { RHDocumentPopup, DocumentType, DOCUMENT_TYPES } from './RHDocumentPopup';
import { 
  TAB_COLUMNS, 
  COLLABORATOR_CATEGORIES, 
  CollaboratorCategory,
  RHTabId 
} from './RHUnifiedTableColumns';
import { Skeleton } from '@/components/ui/skeleton';
import { useRHInlineEdit } from '@/hooks/rh/useRHInlineEdit';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CollaboratorEpiSummary } from '@/hooks/epi/useCollaboratorsEpiSummary';
import { calculateProfileCompleteness } from '@/hooks/rh/useProfileCompleteness';

interface RHUnifiedTableProps {
  collaborators: RHCollaborator[];
  isLoading: boolean;
  visibleColumns: string[];
  onToggleColumn: (columnId: string) => void;
  activeTab: RHTabId;
  onTabChange: (tab: RHTabId) => void;
  onRefresh: () => void;
  onPrintMatrix: () => void;
  epiSummaries?: CollaboratorEpiSummary[];
  showFormer?: boolean;
  onToggleShowFormer?: () => void;
  onEditCollaborator?: (collaboratorId: string) => void;
  onOpenProfile?: (collaborator: RHCollaborator) => void;
  onOpenDocuments?: (collaborator: RHCollaborator) => void;
}

export function RHUnifiedTable({
  collaborators,
  isLoading,
  visibleColumns,
  onToggleColumn,
  activeTab,
  onTabChange,
  onRefresh,
  onPrintMatrix,
  epiSummaries = [],
  showFormer = false,
  onToggleShowFormer,
  onEditCollaborator,
  onOpenProfile,
  onOpenDocuments,
}: RHUnifiedTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [documentPopup, setDocumentPopup] = useState<{
    open: boolean;
    collaboratorId: string;
    collaboratorName: string;
    docType: DocumentType;
  }>({
    open: false,
    collaboratorId: '',
    collaboratorName: '',
    docType: 'cni',
  });
  
  const queryClient = useQueryClient();

  // Upload mutation using media library
  const uploadIdentityDocument = useMutation({
    mutationFn: async ({ collaboratorId, docType, file }: { collaboratorId: string; docType: DocumentType; file: File }) => {
      const collab = collaborators.find(c => c.id === collaboratorId);
      if (!collab) throw new Error('Collaborateur introuvable');
      const agencyId = collab.agency_id;
      if (!agencyId) throw new Error('Agence requise');

      const fileExt = file.name.split('.').pop();
      const fileName = `${docType}_${Date.now()}.${fileExt}`;
      const storagePath = `${agencyId}/salaries/${collaboratorId}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('media-library')
        .upload(storagePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get or create the folder for this collaborator under Salariés hierarchy
      const folderSlug = `salarie-${collaboratorId}`;
      let finalFolderId: string;
      
      // Use ensure_media_folder DB function to create full path
      const { data: ensuredFolderId, error: folderError } = await supabase
        .rpc('ensure_media_folder', {
          p_agency_id: agencyId,
          p_path: `Salariés/${collab.first_name} ${collab.last_name}`.trim(),
          p_entity_type: 'collaborator',
          p_entity_id: collaboratorId,
        });

      if (!folderError && ensuredFolderId) {
        finalFolderId = ensuredFolderId;
      } else {
        // Fallback: try to find existing folder by slug
        const { data: existingFolder } = await supabase
          .from('media_folders')
          .select('id')
          .eq('agency_id', agencyId)
          .eq('slug', folderSlug)
          .is('deleted_at', null)
          .maybeSingle();

        if (!existingFolder) throw folderError || new Error('Impossible de créer le dossier');
        finalFolderId = existingFolder.id;
      }

      // Create media_asset
      const docInfo = DOCUMENT_TYPES.find(d => d.type === docType);
      const { data: asset, error: assetError } = await supabase
        .from('media_assets')
        .insert({
          agency_id: agencyId,
          storage_bucket: 'media-library',
          storage_path: storagePath,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select('id')
        .single();

      if (assetError) throw assetError;

      // Create media_link
      const { error: linkError } = await supabase
        .from('media_links')
        .insert({
          agency_id: agencyId,
          asset_id: asset.id,
          folder_id: finalFolderId,
          label: docInfo?.label || docType,
        });

      if (linkError) throw linkError;
    },
    onSuccess: (_, variables) => {
      toast.success('Document ajouté');
      queryClient.invalidateQueries({ queryKey: ['rh-documents-check', variables.collaboratorId] });
      queryClient.invalidateQueries({ queryKey: ['scoped-media-library'] });
    },
    onError: (error: Error) => {
      toast.error(error?.message || 'Erreur lors de l\'upload du document');
    },
  });

  // Inline edit hook
  const {
    isEditable,
    handleValueChange,
    getLocalValue,
    handleAssetsUpdate,
    hasPendingChanges,
  } = useRHInlineEdit(collaborators, onRefresh);

  // Filtrer par recherche
  const filteredCollaborators = useMemo(() => {
    if (!searchQuery) return collaborators;
    const query = searchQuery.toLowerCase();
    return collaborators.filter(c => 
      c.first_name?.toLowerCase().includes(query) ||
      c.last_name?.toLowerCase().includes(query) ||
      c.email?.toLowerCase().includes(query) ||
      c.role?.toLowerCase().includes(query)
    );
  }, [collaborators, searchQuery]);

  // Grouper par catégorie
  const groupedCollaborators = useMemo(() => {
    const groups: Record<CollaboratorCategory, RHCollaborator[]> = {
      ADMINISTRATIF: [],
      TERRAIN: [],
    };

    filteredCollaborators.forEach(collab => {
      const collabType = collab.type || 'AUTRE';
      let foundCategory: CollaboratorCategory = 'TERRAIN';
      
      for (const [key, config] of Object.entries(COLLABORATOR_CATEGORIES)) {
        if ((config.types as readonly string[]).includes(collabType)) {
          foundCategory = key as CollaboratorCategory;
          break;
        }
      }
      
      groups[foundCategory].push(collab);
    });

    // Trier chaque groupe par nom
    Object.values(groups).forEach(group => {
      group.sort((a, b) => (a.last_name || '').localeCompare(b.last_name || ''));
    });

    return groups;
  }, [filteredCollaborators]);

  // Stats avec progression moyenne
  const stats = useMemo(() => {
    const active = collaborators.filter(c => !c.leaving_date);
    
    // Calcul de la complétude moyenne
    const completenessValues = collaborators.map(c => calculateProfileCompleteness(c).percent);
    const averageCompleteness = completenessValues.length > 0 
      ? completenessValues.reduce((a, b) => a + b, 0) / completenessValues.length 
      : 0;
    
    return {
      total: collaborators.length,
      active: active.length,
      former: collaborators.filter(c => !!c.leaving_date).length,
      administratif: groupedCollaborators.ADMINISTRATIF.length,
      terrain: groupedCollaborators.TERRAIN.length,
      averageCompleteness,
    };
  }, [collaborators, groupedCollaborators]);

  // Compteurs d'alertes par onglet
  const alertCounts = useMemo(() => {
    const counts: Partial<Record<RHTabId, number>> = {};
    // Alertes sécurité (EPI à renouveler)
    const epiAlerts = epiSummaries.filter(s => (s.renewal_due_count || 0) > 0).length;
    if (epiAlerts > 0) counts.securite = epiAlerts;
    return counts;
  }, [epiSummaries]);

  // Total des alertes
  const totalAlerts = useMemo(() => {
    return Object.values(alertCounts).reduce((sum, count) => sum + (count || 0), 0);
  }, [alertCounts]);

  const handleDocumentClick = (collaboratorId: string, docType: DocumentType) => {
    const collab = collaborators.find(c => c.id === collaboratorId);
    if (!collab) return;
    
    setDocumentPopup({
      open: true,
      collaboratorId,
      collaboratorName: `${collab.first_name} ${collab.last_name}`,
      docType,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 flex-1" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 min-h-0 flex-1">
      {/* Stats Header amélioré */}
      <RHStatsHeader
        collaborators={collaborators}
        activeCount={stats.active}
        formerCount={stats.former}
        adminCount={stats.administratif}
        terrainCount={stats.terrain}
        alertsCount={totalAlerts}
        averageCompleteness={stats.averageCompleteness}
        onPrintMatrix={onPrintMatrix}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Onglets sur toute la largeur */}
      <RHUnifiedTabs 
        activeTab={activeTab} 
        onTabChange={onTabChange}
        alertCounts={alertCounts}
      />

      {/* Actions */}
      <div className="flex flex-wrap gap-3 items-center justify-end">
        {/* Indicateur de modifications en attente */}
        {hasPendingChanges && (
          <Badge variant="secondary" className="animate-pulse">
            Modifications en attente
          </Badge>
        )}

      </div>

      {/* Tableau avec colonnes identité sticky */}
      <div className="border rounded-lg overflow-auto flex-1 min-h-0">
        <Table>
          <RHUnifiedTableHeader activeTab={activeTab} visibleColumns={visibleColumns} />
          <TableBody>
            {Object.entries(COLLABORATOR_CATEGORIES).map(([categoryKey, categoryConfig]) => {
              const categoryCollabs = groupedCollaborators[categoryKey as CollaboratorCategory];
              if (categoryCollabs.length === 0) return null;

              return (
                <React.Fragment key={categoryKey}>
                  {/* Header de catégorie */}
                  <TableRow className={cn("hover:bg-transparent", categoryConfig.className)}>
                    <TableCell colSpan={99} className="py-2 font-semibold">
                      <div className="flex items-center gap-2">
                        <span>{categoryConfig.icon}</span>
                        <span>{categoryConfig.label}</span>
                        <span className="text-muted-foreground font-normal">
                          ({categoryCollabs.length})
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Lignes des collaborateurs */}
                  {categoryCollabs.map((collab) => (
                    <RHUnifiedTableRow
                      key={collab.id}
                      collaborator={collab}
                      activeTab={activeTab}
                      visibleColumns={visibleColumns}
                      onDocumentClick={handleDocumentClick}
                      isEditable={isEditable}
                      onValueChange={handleValueChange}
                      getLocalValue={getLocalValue}
                      onAssetsUpdate={handleAssetsUpdate}
                      epiSummary={epiSummaries.find(s => s.collaborator_id === collab.id)}
                      onEditCollaborator={onEditCollaborator}
                      onOpenProfile={onOpenProfile}
                      onOpenDocuments={onOpenDocuments}
                    />
                  ))}
                </React.Fragment>
              );
            })}

            {filteredCollaborators.length === 0 && (
              <TableRow>
                <TableCell colSpan={99} className="h-32 text-center text-muted-foreground">
                  Aucun collaborateur trouvé
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Légende édition */}
      <p className="text-xs text-muted-foreground">
        💡 Double-cliquez sur une cellule pour la modifier. Auto-sauvegarde toutes les 10 secondes.
      </p>

      {/* Popup document */}
      <RHDocumentPopup
        open={documentPopup.open}
        onOpenChange={(open) => setDocumentPopup(prev => ({ ...prev, open }))}
        documentType={documentPopup.docType}
        collaboratorId={documentPopup.collaboratorId}
        collaboratorName={documentPopup.collaboratorName}
        onUpload={(file) => uploadIdentityDocument.mutateAsync({
          collaboratorId: documentPopup.collaboratorId,
          docType: documentPopup.docType,
          file,
        })}
      />
    </div>
  );
}
