import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RHCollaborator } from '@/types/rh-suivi';
import { FIXED_COLUMNS, TAB_COLUMNS, RHTabId } from './RHUnifiedTableColumns';
import { DocumentIcons, DocumentType } from './RHDocumentPopup';
import { RHEditableCell } from './RHEditableCell';
import { ExternalLink } from 'lucide-react';

interface RHUnifiedTableRowProps {
  collaborator: RHCollaborator;
  activeTab: RHTabId;
  visibleColumns: string[];
  onDocumentClick: (collaboratorId: string, docType: DocumentType) => void;
  isEditable: (columnId: string) => boolean;
  onValueChange: (collaboratorId: string, columnId: string, value: string) => void;
  getLocalValue: (collaboratorId: string, columnId: string, originalValue: unknown) => unknown;
}

function getStatusIndicator(collaborator: RHCollaborator) {
  if (collaborator.leaving_date) {
    return { color: 'bg-gray-400', label: 'Sorti' };
  }
  return { color: 'bg-green-500', label: 'Actif' };
}

function getTypeLabel(type: string | null) {
  const labels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
    TECHNICIEN: { label: 'Tech', variant: 'default' },
    ASSISTANTE: { label: 'Asst', variant: 'secondary' },
    DIRIGEANT: { label: 'Dir', variant: 'outline' },
    COMMERCIAL: { label: 'Com', variant: 'secondary' },
    AUTRE: { label: 'Autre', variant: 'outline' },
  };
  return labels[type || ''] || { label: type || '—', variant: 'outline' as const };
}

export function RHUnifiedTableRow({
  collaborator,
  activeTab,
  visibleColumns,
  onDocumentClick,
  isEditable,
  onValueChange,
  getLocalValue,
}: RHUnifiedTableRowProps) {
  const navigate = useNavigate();
  const tabGroups = TAB_COLUMNS[activeTab];
  const status = getStatusIndicator(collaborator);
  const typeInfo = getTypeLabel(collaborator.type);

  // Filtrer les groupes et colonnes visibles
  const visibleGroups = tabGroups.map(group => ({
    ...group,
    columns: group.columns.filter(col => visibleColumns.includes(col.id)),
  })).filter(group => group.columns.length > 0);

  const handleOpenDetail = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/rh/suivi/${collaborator.id}`);
  };

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
      <TableCell className="min-w-[80px] w-[80px] bg-muted/10">
        <Badge variant={typeInfo.variant} className="text-xs">
          {typeInfo.label}
        </Badge>
      </TableCell>

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
