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
import { ExternalLink } from 'lucide-react';

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

  // Render special popup cells
  const renderPopupCell = (colId: string, colIdx: number, className?: string) => {
    const cellClass = cn(colIdx === 0 && "border-l", className, "p-1");
    
    if (colId === 'vehicule_attribue') {
      return (
        <TableCell key={colId} className={cellClass}>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs font-normal w-full justify-start"
            onDoubleClick={() => setVehiculePopupOpen(true)}
            title="Double-clic pour modifier"
          >
            {formatVehiculeDisplay(assets?.vehicule_attribue || null)}
          </Button>
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
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs font-normal w-full justify-start"
            onDoubleClick={() => setCarteCarburantPopupOpen(true)}
            title="Double-clic pour modifier"
          >
            {formatCarteDisplay(assets?.carte_carburant || false, assets?.numero_carte_carburant || undefined)}
          </Button>
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
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs font-normal w-full justify-start"
            onDoubleClick={() => setCarteBancairePopupOpen(true)}
            title="Double-clic pour modifier"
          >
            {formatCarteDisplay(assets?.carte_bancaire || false, assets?.numero_carte_bancaire || undefined)}
          </Button>
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
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs font-normal w-full justify-start"
            onDoubleClick={() => setCarteAutrePopupOpen(true)}
            title="Double-clic pour modifier"
          >
            {assets?.carte_autre_nom || '—'}
          </Button>
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
    
    return null;
  };

  const POPUP_COLUMNS = ['vehicule_attribue', 'carte_carburant', 'carte_bancaire', 'carte_autre'];

  return (
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
          
          // Colonnes avec popup
          if (POPUP_COLUMNS.includes(col.id)) {
            return renderPopupCell(col.id, colIdx, group.className);
          }
          
          const originalValue = col.accessor(collaborator);
          const displayValue = getLocalValue(collaborator.id, col.id, originalValue);
          const editable = isEditable(col.id);
          
          return (
            <TableCell 
              key={col.id}
              className={cn(
                colIdx === 0 && "border-l",
                group.className,
                "p-1"
              )}
            >
              <RHEditableCell
                value={displayValue}
                columnId={col.id}
                collaboratorId={collaborator.id}
                editable={editable}
                onValueChange={onValueChange}
              />
            </TableCell>
          );
        })
      ))}
    </TableRow>
  );
}
