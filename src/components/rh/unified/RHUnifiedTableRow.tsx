import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { RHCollaborator } from '@/types/rh-suivi';
import { FIXED_COLUMNS, TAB_COLUMNS, RHTabId } from './RHUnifiedTableColumns';
import { DocumentIcons, DocumentType } from './RHDocumentPopup';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface RHUnifiedTableRowProps {
  collaborator: RHCollaborator;
  activeTab: RHTabId;
  visibleColumns: string[];
  onDocumentClick: (collaboratorId: string, docType: DocumentType) => void;
}

function formatCellValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined || value === '') {
    return <span className="text-muted-foreground/50">—</span>;
  }
  
  if (typeof value === 'boolean') {
    return value ? (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Oui</Badge>
    ) : (
      <Badge variant="outline" className="bg-muted text-muted-foreground">Non</Badge>
    );
  }
  
  // Format dates
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    try {
      return format(new Date(value), 'dd/MM/yyyy', { locale: fr });
    } catch {
      return value;
    }
  }
  
  return String(value);
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

  const handleRowClick = () => {
    navigate(`/rh/suivi/${collaborator.id}`);
  };

  return (
    <TableRow 
      className={cn(
        "cursor-pointer hover:bg-muted/50 transition-colors",
        collaborator.leaving_date && "opacity-60"
      )}
      onClick={handleRowClick}
    >
      {/* Indicateur de statut */}
      <TableCell className="w-10 px-2">
        <div 
          className={cn("w-2 h-2 rounded-full", status.color)}
          title={status.label}
        />
      </TableCell>

      {/* Colonnes fixes */}
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <span className="hover:underline">{collaborator.last_name}</span>
          {activeTab === 'documents' && (
            <DocumentIcons
              collaboratorId={collaborator.id}
              onDocumentClick={(docType) => onDocumentClick(collaborator.id, docType)}
            />
          )}
        </div>
      </TableCell>
      <TableCell>{collaborator.first_name}</TableCell>
      <TableCell>
        <Badge variant={typeInfo.variant} className="text-xs">
          {typeInfo.label}
        </Badge>
      </TableCell>

      {/* Colonnes de l'onglet actif */}
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
          
          const value = col.accessor(collaborator);
          return (
            <TableCell 
              key={col.id}
              className={cn(
                colIdx === 0 && "border-l",
                group.className
              )}
            >
              {formatCellValue(value)}
            </TableCell>
          );
        })
      ))}
    </TableRow>
  );
}
