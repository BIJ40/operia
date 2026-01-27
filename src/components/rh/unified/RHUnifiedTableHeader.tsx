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

  return (
    <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
      {/* Ligne 1 : Headers groupés avec design épuré */}
      <TableRow className="border-b border-border/50 h-9">
        {/* Colonne avatar/statut - fixe et compacte */}
        <TableHead 
          rowSpan={2} 
          className="w-[52px] min-w-[52px] max-w-[52px] px-1 bg-muted/30 text-center text-xs font-semibold border-r"
        >
          👤
        </TableHead>
        
        {/* Colonnes fixes - Nom/Prénom */}
        <TableHead 
          colSpan={FIXED_COLUMNS.length} 
          className="bg-muted/30 text-center text-xs font-semibold border-r px-2"
        >
          Collaborateur
        </TableHead>
        
        {/* Headers groupés des colonnes de l'onglet - Plus compacts */}
        {visibleGroups.map((group, idx) => (
          <TableHead
            key={group.id}
            colSpan={group.columns.length}
            className={cn(
              "text-center text-xs font-semibold px-2",
              idx < visibleGroups.length - 1 && "border-r",
              group.className
            )}
          >
            {group.label}
          </TableHead>
        ))}
      </TableRow>
      
      {/* Ligne 2 : Colonnes détaillées - Plus compactes */}
      <TableRow className="h-8">
        {/* Colonnes fixes avec largeurs réduites */}
        {FIXED_COLUMNS.map((col, idx) => (
          <TableHead 
            key={col.id} 
            className={cn(
              "text-xs font-medium whitespace-nowrap bg-muted/20 px-2",
              col.width,
              idx === FIXED_COLUMNS.length - 1 && "border-r"
            )}
          >
            {col.label}
          </TableHead>
        ))}
        
        {/* Colonnes de l'onglet actif - Avec largeurs définies */}
        {visibleGroups.map((group, groupIdx) => (
          group.columns.map((col, colIdx) => (
            <TableHead 
              key={col.id}
              className={cn(
                "text-xs font-medium whitespace-nowrap px-2",
                col.width,
                colIdx === 0 && groupIdx > 0 && "border-l",
                colIdx === group.columns.length - 1 && groupIdx < visibleGroups.length - 1 && "border-r",
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
