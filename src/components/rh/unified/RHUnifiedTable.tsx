import React, { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Search, Settings2, Save, Loader2, UserX } from 'lucide-react';
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

  const uploadIdentityDocument = useMutation({
    mutationFn: async ({ collaboratorId, docType, file }: { collaboratorId: string; docType: DocumentType; file: File }) => {
      const collab = collaborators.find(c => c.id === collaboratorId);
      if (!collab) throw new Error('Collaborateur introuvable');
      const agencyId = collab.agency_id;
      if (!agencyId) throw new Error('Agence requise');

      const fileExt = file.name.split('.').pop();
      const fileName = `${docType}_${Date.now()}.${fileExt}`;
      const filePath = `${agencyId}/${collaboratorId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('rh-documents')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { user } } = await supabase.auth.getUser();

      const docInfo = DOCUMENT_TYPES.find(d => d.type === docType);

      const { error: insertError } = await supabase
        .from('collaborator_documents')
        .insert({
          collaborator_id: collaboratorId,
          agency_id: agencyId,
          doc_type: docType,
          title: docInfo?.label || docType,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: user?.id,
          visibility: 'ADMIN_ONLY',
        });

      if (insertError) throw insertError;
    },
    onSuccess: (_, variables) => {
      toast.success('Document ajouté');
      queryClient.invalidateQueries({ queryKey: ['collaborator-documents', variables.collaboratorId] });
      queryClient.invalidateQueries({ queryKey: ['rh-documents-check', variables.collaboratorId] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de l\'upload du document');
    },
  });

  // Inline edit hook
  const {
    isSaving,
    isEditable,
    handleValueChange,
    getLocalValue,
    saveChanges,
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

  // Colonnes disponibles pour l'onglet actif
  const availableColumns = useMemo(() => {
    return TAB_COLUMNS[activeTab].flatMap(group => group.columns);
  }, [activeTab]);

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
      />

      {/* Onglets sur toute la largeur */}
      <RHUnifiedTabs 
        activeTab={activeTab} 
        onTabChange={onTabChange}
        alertCounts={alertCounts}
      />

      {/* Barre de recherche + toggle anciens + actions */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un collaborateur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
          
          {/* Toggle pour afficher les anciens collaborateurs */}
          {onToggleShowFormer && (
            <div className="flex items-center gap-2">
              <Switch
                id="show-former"
                checked={showFormer}
                onCheckedChange={onToggleShowFormer}
              />
              <Label htmlFor="show-former" className="text-sm text-muted-foreground cursor-pointer flex items-center gap-1.5">
                <UserX className="h-3.5 w-3.5" />
                Anciens
                {showFormer && stats.former > 0 && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                    {stats.former}
                  </Badge>
                )}
              </Label>
            </div>
          )}
          
          {/* Indicateur de modifications en attente */}
          {hasPendingChanges && (
            <Badge variant="secondary" className="animate-pulse">
              Modifications en attente
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Bouton sauvegarder - icône seule avec tooltip */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={hasPendingChanges ? "default" : "outline"} 
                  size="icon"
                  onClick={() => saveChanges()}
                  disabled={!hasPendingChanges || isSaving}
                  className="h-9 w-9"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Enregistrer</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-9 w-9">
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Colonnes</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Colonnes visibles</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {availableColumns.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  checked={visibleColumns.includes(col.id)}
                  onCheckedChange={() => onToggleColumn(col.id)}
                >
                  {col.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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
