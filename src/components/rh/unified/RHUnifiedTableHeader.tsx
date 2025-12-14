import React from 'react';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { FIXED_COLUMNS, TAB_COLUMNS, ColumnGroup, RHTabId } from './RHUnifiedTableColumns';

interface RHUnifiedTableHeaderProps {
  activeTab: RHTabId;
  visibleColumns: string[];
}

export function RHUnifiedTableHeader({ activeTab, visibleColumns }: RHUnifiedTableHeaderProps) {
  const tabGroups = TAB_COLUMNS[activeTab];
  
  // Filtrer les groupes et colonnes visibles
  const visibleGroups = tabGroups.map(group => ({
    ...group,
    columns: group.columns.filter(col => visibleColumns.includes(col.id)),
  })).filter(group => group.columns.length > 0);

  // Calculer le nombre total de colonnes pour les groupes
  const hasMultipleColumns = visibleGroups.some(g => g.columns.length > 1);

  return (
    <TableHeader className="sticky top-0 z-10 bg-background">
      {/* Ligne 1 : Headers groupés (si nécessaire) */}
      {hasMultipleColumns && (
        <TableRow className="border-b-0">
          {/* Colonnes fixes - header vide pour l'alignement */}
          <TableHead 
            colSpan={FIXED_COLUMNS.length + 1} 
            className="bg-muted/50 text-center font-semibold border-r"
          >
            Collaborateur
          </TableHead>
          
          {/* Headers groupés des colonnes de l'onglet */}
          {visibleGroups.map((group, idx) => (
            <TableHead
              key={group.id}
              colSpan={group.columns.length}
              className={cn(
                "text-center font-semibold border-r last:border-r-0",
                group.className
              )}
            >
              {group.label}
            </TableHead>
          ))}
        </TableRow>
      )}
      
      {/* Ligne 2 : Colonnes détaillées */}
      <TableRow>
        {/* Colonne statut (indicateur visuel) */}
        <TableHead className="w-10 px-2"></TableHead>
        
        {/* Colonnes fixes */}
        {FIXED_COLUMNS.map((col) => (
          <TableHead key={col.id} className="font-medium whitespace-nowrap">
            {col.label}
          </TableHead>
        ))}
        
        {/* Colonnes de l'onglet actif */}
        {visibleGroups.map((group, groupIdx) => (
          group.columns.map((col, colIdx) => (
            <TableHead 
              key={col.id}
              className={cn(
                "font-medium whitespace-nowrap",
                colIdx === 0 && "border-l",
                group.className
              )}
            >
              {col.label}
            </TableHead>
          ))
        ))}
      </TableRow>
    </TableHeader>
  );
}
