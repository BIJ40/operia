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
    <TableHeader className="sticky top-0 z-10 bg-background">
      {/* Ligne 1 : Headers groupés - TOUJOURS afficher la partie COLLABORATEUR */}
      <TableRow className="border-b-0">
        {/* Colonnes fixes - COLLABORATEUR toujours visible avec largeur fixe */}
        <TableHead 
          colSpan={FIXED_COLUMNS.length + 1} 
          className="bg-muted/50 text-center font-semibold border-r min-w-[320px] w-[320px]"
        >
          👤 COLLABORATEUR
        </TableHead>
        
        {/* Headers groupés des colonnes de l'onglet */}
        {visibleGroups.map((group) => (
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
      
      {/* Ligne 2 : Colonnes détaillées */}
      <TableRow>
        {/* Colonne statut (indicateur visuel) - largeur fixe */}
        <TableHead className="w-10 min-w-[40px] px-2 bg-muted/30"></TableHead>
        
        {/* Colonnes fixes avec largeurs fixes */}
        {FIXED_COLUMNS.map((col, idx) => (
          <TableHead 
            key={col.id} 
            className={cn(
              "font-medium whitespace-nowrap bg-muted/30",
              col.id === 'last_name' && "min-w-[100px] w-[100px]",
              col.id === 'first_name' && "min-w-[100px] w-[100px]",
              col.id === 'type' && "min-w-[80px] w-[80px]"
            )}
          >
            {col.label}
          </TableHead>
        ))}
        
        {/* Colonnes de l'onglet actif */}
        {visibleGroups.map((group) => (
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
