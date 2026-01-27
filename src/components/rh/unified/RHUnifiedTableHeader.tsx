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
        {/* Colonne avatar/statut - sticky à gauche */}
        <TableHead 
          rowSpan={2} 
          className="w-[52px] min-w-[52px] px-1 bg-muted/80 text-center text-xs font-semibold border-r sticky left-0 z-20"
        >
          👤
        </TableHead>
        
        {/* Colonnes fixes Nom/Prénom - sticky à gauche après avatar */}
        <TableHead 
          colSpan={FIXED_COLUMNS.length} 
          className="bg-muted/80 text-center text-xs font-semibold border-r px-2 sticky left-[52px] z-20"
          style={{ minWidth: '170px' }}
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
        {/* Colonnes fixes Nom/Prénom - sticky */}
        {FIXED_COLUMNS.map((col, idx) => {
          // Position sticky cumulative : avatar = 52px, puis on empile
          const leftOffset = 52 + idx * 85; // 85px par colonne fixe environ
          return (
            <TableHead 
              key={col.id} 
              className={cn(
                "text-xs font-medium whitespace-nowrap bg-muted/80 px-2 sticky z-20",
                col.width,
                idx === FIXED_COLUMNS.length - 1 && "border-r"
              )}
              style={{ left: `${leftOffset}px`, minWidth: idx === 0 ? '90px' : '80px' }}
            >
              {col.label}
            </TableHead>
          );
        })}
        
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
