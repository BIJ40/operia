import React, { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { RHCollaborator } from '@/types/rh-suivi';
import { FIXED_COLUMNS, TAB_COLUMNS, RHTabId } from './RHUnifiedTableColumns';
import { DocumentIcons, DocumentType } from './RHDocumentPopup';
import { RHEditableCell } from './RHEditableCell';
import { RHVehicleSelectCell } from './RHVehicleSelectCell';
import { RHCartePopup, formatCarteDisplay } from './RHCartePopup';
import { RHDocumentUploadPopup } from './RHDocumentUploadPopup';
import { RHMaterielPopup } from './RHMaterielPopup';
import { RHIdentifiantsDynamicColumns } from './RHIdentifiantsDynamicColumns';
import { RHDocumentCell } from './RHDocumentCell';
import { RHMetiersMultiSelect } from './RHMetiersMultiSelect';
import { ExternalLink, Paperclip, Package, Pencil, Trash2, Loader2, UserCog, Wrench, User } from 'lucide-react';
import { CollaboratorEpiSummary } from '@/hooks/epi/useCollaboratorsEpiSummary';
import { EpiCountCell, EpiRenewalCell, EpiRequestsCell, EpiIncidentsCell, EpiAckStatusCell, EpiOkCell } from './RHEpiCells';
import { RHCollaboratorAvatarCompact } from './RHCollaboratorAvatar';
import { RHGlobalStatusIndicator } from './RHStatusBadges';
import { CollaboratorHoverPreview } from './CollaboratorHoverPreview';
import { RHTaillesIndicator, RHTaillesPopup } from './RHTaillesPopup';
import { RHEpiIndicator, RHEpiPopup } from './RHEpiPopup';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDeleteCollaborator, useUpdateCollaboratorType } from '@/hooks/useRHSuivi';

interface RHUnifiedTableRowProps {
  collaborator: RHCollaborator;
  activeTab: RHTabId;
  visibleColumns: string[];
  onDocumentClick: (collaboratorId: string, docType: DocumentType) => void;
  isEditable: (columnId: string) => boolean;
  onValueChange: (collaboratorId: string, columnId: string, value: string) => void;
  getLocalValue: (collaboratorId: string, columnId: string, originalValue: unknown) => unknown;
  onAssetsUpdate?: (collaboratorId: string, field: string, value: unknown) => void;
  epiSummary?: CollaboratorEpiSummary;
  /** Callback pour éditer le collaborateur via le wizard */
  onEditCollaborator?: (collaboratorId: string) => void;
  /** Callback pour ouvrir le profil dans un onglet */
  onOpenProfile?: (collaborator: RHCollaborator) => void;
  /** Callback pour ouvrir les documents (coffre) du collaborateur */
  onOpenDocuments?: (collaborator: RHCollaborator) => void;
}

function getStatusIndicator(collaborator: RHCollaborator) {
  if (collaborator.leaving_date) {
    return { color: 'bg-gray-400', label: 'Sorti' };
  }
  return { color: 'bg-green-500', label: 'Actif' };
}

export function RHUnifiedTableRow({
  collaborator,
  activeTab,
  visibleColumns,
  onDocumentClick,
  isEditable,
  onValueChange,
  getLocalValue,
  onAssetsUpdate,
  epiSummary,
  onEditCollaborator,
  onOpenProfile,
  onOpenDocuments,
}: RHUnifiedTableRowProps) {
  const queryClient = useQueryClient();
  const tabGroups = TAB_COLUMNS[activeTab];
  const status = getStatusIndicator(collaborator);
  
  // Popup states
  const [carteCarburantPopupOpen, setCarteCarburantPopupOpen] = useState(false);
  const [carteBancairePopupOpen, setCarteBancairePopupOpen] = useState(false);
  const [carteAutrePopupOpen, setCarteAutrePopupOpen] = useState(false);
  const [materielPopupOpen, setMaterielPopupOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [taillesPopupOpen, setTaillesPopupOpen] = useState(false);
  const [epiPopupOpen, setEpiPopupOpen] = useState(false);
  
  // Delete mutation
  const deleteCollaborator = useDeleteCollaborator();
  const updateType = useUpdateCollaboratorType();
  
  // Callback pour rafraîchir les identifiants
  const handleIdentifiantsRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['rh-collaborators'] });
  }, [queryClient]);
  
  // Parse identifiants from it_access
  const getIdentifiants = () => {
    const encrypted = collaborator.it_access?.identifiants_encrypted;
    if (!encrypted) return [];
    try {
      const parsed = JSON.parse(encrypted);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  
  // Document upload popup state
  const [docUploadPopup, setDocUploadPopup] = useState<{ open: boolean; fieldKey: string; fieldLabel: string }>({
    open: false, fieldKey: '', fieldLabel: ''
  });
  
  const collaboratorName = `${collaborator.first_name} ${collaborator.last_name}`;

  // Filtrer les groupes et colonnes visibles
  const visibleGroups = tabGroups.map(group => ({
    ...group,
    columns: group.columns.filter(col => visibleColumns.includes(col.id)),
  })).filter(group => group.columns.length > 0);


  const assets = collaborator.assets;

  // Bouton pour ouvrir l'upload de documents
  const renderDocUploadButton = (fieldKey: string, fieldLabel: string) => (
    <Button
      variant="ghost"
      size="icon"
      className="h-5 w-5 opacity-40 hover:opacity-100"
      onClick={(e) => {
        e.stopPropagation();
        setDocUploadPopup({ open: true, fieldKey, fieldLabel });
      }}
      title="Ajouter un document"
    >
      <Paperclip className="h-3 w-3" />
    </Button>
  );

  // Render special popup cells
  const renderPopupCell = (colId: string, colIdx: number, className?: string) => {
    const cellClass = cn(colIdx === 0 && "border-l", className, "p-1");
    
    if (colId === 'vehicule_attribue') {
      return (
        <TableCell key={colId} className={cellClass}>
          <RHVehicleSelectCell
            collaboratorId={collaborator.id}
            currentVehicleId={null}
          />
        </TableCell>
      );
    }
    
    if (colId === 'carte_carburant') {
      return (
        <TableCell key={colId} className={cellClass}>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs font-normal flex-1 justify-start"
              onDoubleClick={() => setCarteCarburantPopupOpen(true)}
              title="Double-clic pour modifier"
            >
              {formatCarteDisplay(assets?.carte_carburant || false, assets?.numero_carte_carburant || undefined)}
            </Button>
            {renderDocUploadButton('carte_carburant', 'Carte Carburant')}
          </div>
          <RHCartePopup
            open={carteCarburantPopupOpen}
            onOpenChange={setCarteCarburantPopupOpen}
            title="Carte Carburant"
            value={{
              active: assets?.carte_carburant || false,
              numero: assets?.numero_carte_carburant || '',
              fournisseur: assets?.fournisseur_carte_carburant || '',
            }}
            onSave={(data) => {
              onAssetsUpdate?.(collaborator.id, 'carte_carburant_data', data);
            }}
          />
        </TableCell>
      );
    }
    
    if (colId === 'carte_bancaire') {
      return (
        <TableCell key={colId} className={cellClass}>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs font-normal flex-1 justify-start"
              onDoubleClick={() => setCarteBancairePopupOpen(true)}
              title="Double-clic pour modifier"
            >
              {formatCarteDisplay(assets?.carte_bancaire || false, assets?.numero_carte_bancaire || undefined)}
            </Button>
            {renderDocUploadButton('carte_bancaire', 'Carte Bancaire')}
          </div>
          <RHCartePopup
            open={carteBancairePopupOpen}
            onOpenChange={setCarteBancairePopupOpen}
            title="Carte Bancaire"
            value={{
              active: assets?.carte_bancaire || false,
              numero: assets?.numero_carte_bancaire || '',
              fournisseur: assets?.fournisseur_carte_bancaire || '',
            }}
            onSave={(data) => {
              onAssetsUpdate?.(collaborator.id, 'carte_bancaire_data', data);
            }}
          />
        </TableCell>
      );
    }
    
    if (colId === 'carte_autre') {
      return (
        <TableCell key={colId} className={cellClass}>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs font-normal flex-1 justify-start"
              onDoubleClick={() => setCarteAutrePopupOpen(true)}
              title="Double-clic pour modifier"
            >
              {assets?.carte_autre_nom || '—'}
            </Button>
            {renderDocUploadButton('carte_autre', 'Autre Carte')}
          </div>
          <RHCartePopup
            open={carteAutrePopupOpen}
            onOpenChange={setCarteAutrePopupOpen}
            title="Autre Carte"
            value={{
              active: !!assets?.carte_autre_nom,
              numero: assets?.carte_autre_numero || '',
              fournisseur: assets?.carte_autre_fournisseur || '',
            }}
            onSave={(data) => {
              onAssetsUpdate?.(collaborator.id, 'carte_autre_data', { ...data, nom: data.active ? (assets?.carte_autre_nom || 'Autre') : '' });
            }}
          />
        </TableCell>
      );
    }
    
    // Informatique
    if (colId === 'informatique_liste') {
      const equipements = (assets?.autres_equipements as unknown as { nom: string; categorie?: string }[]) || [];
      const infoItems = equipements.filter(e => e.categorie === 'informatique' || !e.categorie);
      const count = infoItems.length;
      
      return (
        <TableCell key={colId} className={cellClass}>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs font-normal w-full justify-start gap-2"
            onDoubleClick={() => setMaterielPopupOpen(true)}
            title={count > 0 ? `${count}: ${infoItems.map(e => e.nom).join(', ')}` : 'Double-clic pour ajouter'}
          >
            <Package className={cn("h-3.5 w-3.5", count > 0 ? "text-blue-600" : "text-muted-foreground")} />
            {count > 0 ? (
              <span className="inline-flex items-center gap-1">
                <span className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                  {count}
                </span>
                <span className="text-muted-foreground truncate max-w-[80px]">
                  {infoItems.map(e => e.nom).join(', ')}
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </Button>
        </TableCell>
      );
    }
    
    // Outils
    if (colId === 'outils_liste') {
      const equipements = (assets?.autres_equipements as unknown as { nom: string; categorie?: string }[]) || [];
      const outilItems = equipements.filter(e => e.categorie === 'outils');
      const count = outilItems.length;
      
      return (
        <TableCell key={colId} className={cellClass}>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs font-normal w-full justify-start gap-2"
            onDoubleClick={() => setMaterielPopupOpen(true)}
            title={count > 0 ? `${count}: ${outilItems.map(e => e.nom).join(', ')}` : 'Double-clic pour ajouter'}
          >
            <Package className={cn("h-3.5 w-3.5", count > 0 ? "text-orange-600" : "text-muted-foreground")} />
            {count > 0 ? (
              <span className="inline-flex items-center gap-1">
                <span className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                  {count}
                </span>
                <span className="text-muted-foreground truncate max-w-[80px]">
                  {outilItems.map(e => e.nom).join(', ')}
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </Button>
        </TableCell>
      );
    }
    
    // Identifiants - colonnes dynamiques
    if (colId === 'identifiants_liste') {
      const identifiants = getIdentifiants();
      
      return (
        <TableCell key={colId} className={cellClass}>
          <RHIdentifiantsDynamicColumns
            collaboratorId={collaborator.id}
            collaboratorName={collaboratorName}
            identifiants={identifiants}
            onRefresh={handleIdentifiantsRefresh}
          />
        </TableCell>
      );
    }
    // Métiers multi-select
    if (colId === 'metiers_liste') {
      const competences = collaborator.competencies?.competences_techniques || [];
      return (
        <TableCell key={colId} className={cellClass}>
          <RHMetiersMultiSelect
            collaboratorId={collaborator.id}
            selectedMetiers={competences}
          />
        </TableCell>
      );
    }
    
    // Tailles compactes
    if (colId === 'tailles_all') {
      return (
        <TableCell key={colId} className={cellClass}>
          <RHTaillesIndicator 
            collaborator={collaborator} 
            onClick={() => setTaillesPopupOpen(true)} 
          />
        </TableCell>
      );
    }
    
    // EPI indicator
    if (colId === 'epi_indicator') {
      return (
        <TableCell key={colId} className={cellClass}>
          <RHEpiIndicator 
            collaborator={collaborator} 
            onClick={() => setEpiPopupOpen(true)} 
          />
        </TableCell>
      );
    }
    
    return null;
  };

  const POPUP_COLUMNS = ['vehicule_attribue', 'carte_carburant', 'carte_bancaire', 'carte_autre', 'informatique_liste', 'outils_liste', 'identifiants_liste', 'metiers_liste', 'tailles_all', 'epi_indicator'];
  
  // Colonnes EPI (anciennes - pour compatibilité)
  const EPI_COLUMNS = ['epi_count', 'epi_renewal', 'epi_requests', 'epi_incidents', 'epi_ack_status', 'epi_ok'];
  
  // Colonnes avec possibilité d'upload de documents
  const DOCUMENT_UPLOAD_COLUMNS = ['habilitation_electrique', 'caces', 'visite_medicale'];
  
  // Colonnes de documents (permis, cni)
  const DOCUMENT_CELL_COLUMNS = ['permis', 'cni'];

  // Render EPI cell
  const renderEpiCell = (colId: string, colIdx: number, className?: string) => {
    const cellClass = cn(colIdx === 0 && "border-l", className, "p-1");
    
    switch (colId) {
      case 'epi_count':
        return <TableCell key={colId} className={cellClass}><EpiCountCell summary={epiSummary} /></TableCell>;
      case 'epi_renewal':
        return <TableCell key={colId} className={cellClass}><EpiRenewalCell summary={epiSummary} /></TableCell>;
      case 'epi_requests':
        return <TableCell key={colId} className={cellClass}><EpiRequestsCell summary={epiSummary} /></TableCell>;
      case 'epi_incidents':
        return <TableCell key={colId} className={cellClass}><EpiIncidentsCell summary={epiSummary} /></TableCell>;
      case 'epi_ack_status':
        return <TableCell key={colId} className={cellClass}><EpiAckStatusCell summary={epiSummary} /></TableCell>;
      case 'epi_ok':
        return <TableCell key={colId} className={cellClass}><EpiOkCell summary={epiSummary} /></TableCell>;
      default:
        return null;
    }
  };

  // Render document cell for permis/cni
  const renderDocumentCell = (colId: string, colIdx: number, className?: string) => {
    const cellClass = cn(colIdx === 0 && "border-l", className, "p-1");
    const docType = colId as 'permis' | 'cni';
    
    return (
      <TableCell key={colId} className={cellClass}>
        <RHDocumentCell
          collaboratorId={collaborator.id}
          agencyId={collaborator.agency_id}
          docType={docType}
        />
      </TableCell>
    );
  };

  return (
    <>
    {/* Document Upload Popup */}
    <RHDocumentUploadPopup
      open={docUploadPopup.open}
      onOpenChange={(open) => setDocUploadPopup({ ...docUploadPopup, open })}
      collaboratorId={collaborator.id}
      collaboratorName={collaboratorName}
      fieldKey={docUploadPopup.fieldKey}
      fieldLabel={docUploadPopup.fieldLabel}
    />
    
    {/* Materiel Popup */}
    <RHMaterielPopup
      isOpen={materielPopupOpen}
      onClose={() => setMaterielPopupOpen(false)}
      collaboratorId={collaborator.id}
      collaboratorName={collaboratorName}
    />
    
    {/* Tailles Popup */}
    <RHTaillesPopup
      open={taillesPopupOpen}
      onOpenChange={setTaillesPopupOpen}
      collaborator={collaborator}
    />
    
    {/* EPI Popup */}
    <RHEpiPopup
      open={epiPopupOpen}
      onOpenChange={setEpiPopupOpen}
      collaborator={collaborator}
    />
    
    {/* Delete confirmation dialog */}
    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer définitivement ce collaborateur ?</AlertDialogTitle>
          <AlertDialogDescription>
            Cette action est irréversible. Toutes les données liées à <strong>{collaborator.first_name} {collaborator.last_name}</strong> seront supprimées : profil EPI, compétences, matériel, accès IT et documents.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteCollaborator.isPending}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              deleteCollaborator.mutate(collaborator.id, {
                onSuccess: () => setShowDeleteDialog(false),
              });
            }}
            disabled={deleteCollaborator.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteCollaborator.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Suppression...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <TableRow 
          className={cn(
            "hover:bg-accent/50 transition-all duration-150 group",
            collaborator.leaving_date && "opacity-50",
            "hover:shadow-sm"
          )}
    >
      {/* Avatar + indicateur global - STICKY à gauche */}
      <TableCell className="w-[52px] min-w-[52px] px-1 bg-background sticky left-0 z-10">
        <div className="flex items-center gap-0.5">
          <RHCollaboratorAvatarCompact collaborator={collaborator} />
          <RHGlobalStatusIndicator 
            collaborator={collaborator} 
            epiSummary={epiSummary} 
          />
        </div>
      </TableCell>
      

      {/* Colonnes fixes - Nom avec HoverCard preview - STICKY */}
      <TableCell className="font-medium w-[90px] min-w-[90px] px-1 bg-background sticky left-[52px] z-10">
        <div className="flex items-center gap-0.5">
          <CollaboratorHoverPreview
            collaborator={collaborator}
            epiSummary={epiSummary}
            onOpenProfile={onOpenProfile ? () => onOpenProfile(collaborator) : undefined}
          >
            <button
              onClick={() => onOpenProfile?.(collaborator)}
              className="truncate text-left hover:text-primary hover:underline transition-colors text-xs font-medium max-w-[70px]"
              title={collaborator.last_name}
            >
              {collaborator.last_name}
            </button>
          </CollaboratorHoverPreview>
          {collaborator.leaving_date && (
            <Badge variant="outline" className="text-[8px] px-0.5 py-0 text-muted-foreground border-muted-foreground/50 shrink-0">
              Ex
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="w-[80px] min-w-[80px] px-1 bg-background sticky left-[142px] z-10 border-r">
        <button
          onClick={() => onOpenProfile?.(collaborator)}
          className="truncate text-left hover:text-primary hover:underline transition-colors text-xs max-w-[70px]"
          title={collaborator.first_name}
        >
          {collaborator.first_name}
        </button>
      </TableCell>

      {/* Colonnes de l'onglet actif - COMPACTES */}
      {visibleGroups.map((group) => (
        group.columns.map((col, colIdx) => {
          // Cas spécial pour les icônes de documents (plus grandes)
          if (col.id === 'docs_icons') {
            return (
              <TableCell key={col.id} className={cn(colIdx === 0 && "border-l", group.className, "px-1.5")}>
                <DocumentIcons
                  collaboratorId={collaborator.id}
                  agencyId={collaborator.agency_id}
                  onDocumentClick={(docType) => onDocumentClick(collaborator.id, docType)}
                  large
                />
              </TableCell>
            );
          }
          
          // Cas spécial pour l'accès coffre
          if (col.id === 'docs_coffre') {
            return (
              <TableCell key={col.id} className={cn(colIdx === 0 && "border-l", group.className, "px-1.5")}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-[10px] gap-1"
                  onClick={() => onOpenDocuments?.(collaborator)}
                  title="Gérer les documents"
                >
                  <ExternalLink className="h-3 w-3" />
                  Coffre
                </Button>
              </TableCell>
            );
          }
          
          // Colonnes de documents (permis, cni)
          if (DOCUMENT_CELL_COLUMNS.includes(col.id)) {
            return renderDocumentCell(col.id, colIdx, group.className);
          }
          
          // Colonnes EPI
          if (EPI_COLUMNS.includes(col.id)) {
            return renderEpiCell(col.id, colIdx, group.className);
          }
          
          // Colonnes avec popup
          if (POPUP_COLUMNS.includes(col.id)) {
            return renderPopupCell(col.id, colIdx, group.className);
          }
          
          const originalValue = col.accessor(collaborator);
          const displayValue = getLocalValue(collaborator.id, col.id, originalValue);
          const editable = isEditable(col.id);
          
          // Colonnes avec possibilité d'upload de documents
          const canUploadDoc = DOCUMENT_UPLOAD_COLUMNS.includes(col.id);
          
          return (
            <TableCell 
              key={col.id}
              className={cn(
                colIdx === 0 && "border-l",
                group.className,
                "px-1.5 py-0.5",
                col.width
              )}
            >
              <div className="flex items-center gap-0.5">
                <div className="flex-1 min-w-0">
                  <RHEditableCell
                    value={displayValue}
                    columnId={col.id}
                    collaboratorId={collaborator.id}
                    editable={editable}
                    onValueChange={onValueChange}
                  />
                </div>
                {canUploadDoc && renderDocUploadButton(col.id, col.label)}
              </div>
            </TableCell>
          );
        })
      ))}
        </TableRow>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {onOpenProfile && (
          <ContextMenuItem onClick={() => onOpenProfile(collaborator)}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Ouvrir la fiche complète
          </ContextMenuItem>
        )}
        {onEditCollaborator && (
          <ContextMenuItem onClick={() => onEditCollaborator(collaborator.id)}>
            <Pencil className="h-4 w-4 mr-2" />
            Modifier (Wizard)
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <UserCog className="h-4 w-4 mr-2" />
            Changer classification
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="bg-background">
            <ContextMenuItem onClick={() => updateType.mutate({ collaboratorId: collaborator.id, type: 'TECHNICIEN' })} disabled={collaborator.type === 'TECHNICIEN'}>
              <Wrench className="h-4 w-4 mr-2" /> Technicien (terrain)
            </ContextMenuItem>
            <ContextMenuItem onClick={() => updateType.mutate({ collaboratorId: collaborator.id, type: 'ADMINISTRATIF' })} disabled={collaborator.type === 'ADMINISTRATIF'}>
              <User className="h-4 w-4 mr-2" /> Administratif
            </ContextMenuItem>
            <ContextMenuItem onClick={() => updateType.mutate({ collaboratorId: collaborator.id, type: 'DIRIGEANT' })} disabled={collaborator.type === 'DIRIGEANT'}>
              <User className="h-4 w-4 mr-2" /> Dirigeant (admin)
            </ContextMenuItem>
            <ContextMenuItem onClick={() => updateType.mutate({ collaboratorId: collaborator.id, type: 'COMMERCIAL' })} disabled={collaborator.type === 'COMMERCIAL'}>
              <User className="h-4 w-4 mr-2" /> Commercial (admin)
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem 
          onClick={() => setShowDeleteDialog(true)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Supprimer définitivement
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
    </>
  );
}
