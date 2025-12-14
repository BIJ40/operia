import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RHCollaborator } from '@/types/rh-suivi';
import { FIXED_COLUMNS, TAB_COLUMNS, RHTabId } from './RHUnifiedTableColumns';
import { DocumentIcons, DocumentType } from './RHDocumentPopup';
import { RHEditableCell } from './RHEditableCell';
import { RHVehiculePopup, formatVehiculeDisplay } from './RHVehiculePopup';
import { RHCartePopup, formatCarteDisplay } from './RHCartePopup';
import { RHDocumentUploadPopup } from './RHDocumentUploadPopup';
import { RHMaterielPopup } from './RHMaterielPopup';
import { RHIdentifiantsPopup } from './RHIdentifiantsPopup';
import { RHDocumentCell } from './RHDocumentCell';
import { ExternalLink, Paperclip, Package, Key } from 'lucide-react';

interface RHUnifiedTableRowProps {
  collaborator: RHCollaborator;
  activeTab: RHTabId;
  visibleColumns: string[];
  onDocumentClick: (collaboratorId: string, docType: DocumentType) => void;
  isEditable: (columnId: string) => boolean;
  onValueChange: (collaboratorId: string, columnId: string, value: string) => void;
  getLocalValue: (collaboratorId: string, columnId: string, originalValue: unknown) => unknown;
  onAssetsUpdate?: (collaboratorId: string, field: string, value: unknown) => void;
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
}: RHUnifiedTableRowProps) {
  const navigate = useNavigate();
  const tabGroups = TAB_COLUMNS[activeTab];
  const status = getStatusIndicator(collaborator);
  
  // Popup states
  const [vehiculePopupOpen, setVehiculePopupOpen] = useState(false);
  const [carteCarburantPopupOpen, setCarteCarburantPopupOpen] = useState(false);
  const [carteBancairePopupOpen, setCarteBancairePopupOpen] = useState(false);
  const [carteAutrePopupOpen, setCarteAutrePopupOpen] = useState(false);
  const [materielPopupOpen, setMaterielPopupOpen] = useState(false);
  const [identifiantsPopupOpen, setIdentifiantsPopupOpen] = useState(false);
  
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

  const handleOpenDetail = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/rh/suivi/${collaborator.id}`);
  };

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
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs font-normal flex-1 justify-start"
              onDoubleClick={() => setVehiculePopupOpen(true)}
              title="Double-clic pour modifier"
            >
              {formatVehiculeDisplay(assets?.vehicule_attribue || null)}
            </Button>
            {renderDocUploadButton('vehicule', 'Véhicule')}
          </div>
          <RHVehiculePopup
            open={vehiculePopupOpen}
            onOpenChange={setVehiculePopupOpen}
            value={assets?.vehicule_attribue || null}
            onSave={(data) => {
              const jsonValue = JSON.stringify(data);
              onValueChange(collaborator.id, 'vehicule_attribue', jsonValue);
            }}
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
    
    // Matériels
    if (colId === 'materiels_liste') {
      const equipements = (assets?.autres_equipements as unknown as { nom: string }[]) || [];
      const displayText = equipements.length > 0 
        ? equipements.map(e => e.nom).join(', ') 
        : '—';
      
      return (
        <TableCell key={colId} className={cellClass}>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs font-normal w-full justify-start"
            onDoubleClick={() => setMaterielPopupOpen(true)}
            title="Double-clic pour modifier"
          >
            <Package className="h-3 w-3 mr-1" />
            {displayText}
          </Button>
        </TableCell>
      );
    }
    
    // Identifiants
    if (colId === 'identifiants_liste') {
      const identifiants = collaborator.it_access?.identifiants_encrypted;
      let count = 0;
      if (identifiants) {
        try {
          const parsed = JSON.parse(identifiants);
          count = Array.isArray(parsed) ? parsed.length : 0;
        } catch {
          count = 0;
        }
      }
      
      return (
        <TableCell key={colId} className={cellClass}>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs font-normal w-full justify-start"
            onDoubleClick={() => setIdentifiantsPopupOpen(true)}
            title="Double-clic pour modifier"
          >
            <Key className="h-3 w-3 mr-1" />
            {count > 0 ? `${count} accès` : '—'}
          </Button>
        </TableCell>
      );
    }
    
    return null;
  };

  const POPUP_COLUMNS = ['vehicule_attribue', 'carte_carburant', 'carte_bancaire', 'carte_autre', 'materiels_liste', 'identifiants_liste'];
  
  // Colonnes avec possibilité d'upload de documents
  const DOCUMENT_UPLOAD_COLUMNS = ['habilitation_electrique', 'caces', 'visite_medicale'];
  
  // Colonnes de documents (permis, cni)
  const DOCUMENT_CELL_COLUMNS = ['permis', 'cni'];

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
    
    {/* Identifiants Popup */}
    <RHIdentifiantsPopup
      isOpen={identifiantsPopupOpen}
      onClose={() => setIdentifiantsPopupOpen(false)}
      collaboratorId={collaborator.id}
      collaboratorName={collaboratorName}
    />
    
    <TableRow 
      className={cn(
        "hover:bg-muted/30 transition-colors",
        collaborator.leaving_date && "opacity-60"
      )}
    >
      {/* Indicateur de statut */}
      <TableCell className="w-10 min-w-[40px] px-2 bg-muted/10">
        <div 
          className={cn("w-2 h-2 rounded-full", status.color)}
          title={status.label}
        />
      </TableCell>

      {/* Colonnes fixes */}
      <TableCell className="font-medium min-w-[100px] w-[100px] bg-muted/10">
        <div className="flex items-center gap-1">
          <span className="truncate">{collaborator.last_name}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 opacity-50 hover:opacity-100"
            onClick={handleOpenDetail}
            title="Voir la fiche complète"
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
          {activeTab === 'documents' && (
            <DocumentIcons
              collaboratorId={collaborator.id}
              onDocumentClick={(docType) => onDocumentClick(collaborator.id, docType)}
            />
          )}
        </div>
      </TableCell>
      <TableCell className="min-w-[100px] w-[100px] bg-muted/10">{collaborator.first_name}</TableCell>

      {/* Colonnes de l'onglet actif - ÉDITABLES */}
      {visibleGroups.map((group) => (
        group.columns.map((col, colIdx) => {
          // Cas spécial pour les icônes de documents
          if (col.id === 'docs_icons') {
            return (
              <TableCell key={col.id} className={cn(colIdx === 0 && "border-l", group.className)}>
                <DocumentIcons
                  collaboratorId={collaborator.id}
                  onDocumentClick={(docType) => onDocumentClick(collaborator.id, docType)}
                />
              </TableCell>
            );
          }
          
          // Colonnes de documents (permis, cni)
          if (DOCUMENT_CELL_COLUMNS.includes(col.id)) {
            return renderDocumentCell(col.id, colIdx, group.className);
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
                "p-1"
              )}
            >
              <div className="flex items-center gap-1">
                <div className="flex-1">
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
    </>
  );
}
