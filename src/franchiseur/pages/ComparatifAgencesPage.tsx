/**
 * Page Comparatif Agences - Tableau comparatif des KPI par agence
 */

import { useState, useMemo } from 'react';
import { Settings2, Download, Pin, PinOff, TableProperties } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useNetworkFilters } from '@/franchiseur/contexts/NetworkFiltersContext';
import { useFranchiseur } from '@/franchiseur/contexts/FranchiseurContext';
import { NetworkPeriodSelector } from '@/franchiseur/components/filters/NetworkPeriodSelector';
import { AgencySelector } from '@/franchiseur/components/filters/AgencySelector';
import { useStatiaComparatifAgences } from '@/statia/hooks/useStatiaComparatifAgences';
import { FranchiseurPageHeader } from '../components/layout/FranchiseurPageHeader';
import { FranchiseurPageContainer } from '../components/layout/FranchiseurPageContainer';
import {
  COMPARATIF_INDICATORS,
  INDICATOR_GROUPS,
  getDefaultVisibleIndicators,
  getIndicatorsByGroup,
  ComparatifIndicatorId,
  IndicatorFormat,
} from '@/franchiseur/config/comparatifIndicators';
import type { ComparatifAgenceRow } from '@/statia/engines/comparatifAgencesEngine';

function formatComparatifValue(value: number | null | undefined, format: IndicatorFormat): string {
  if (value === null || value === undefined) return '–';
  
  switch (format) {
    case 'currency':
      return Math.round(value).toLocaleString('fr-FR') + ' €';
    case 'percent':
      return value.toFixed(1) + '%';
    case 'days':
      return value + ' j';
    case 'number':
      return value.toLocaleString('fr-FR');
    default:
      return String(value);
  }
}

interface IndicatorSelectorProps {
  selected: ComparatifIndicatorId[];
  onChange: (ids: ComparatifIndicatorId[]) => void;
}

function IndicatorSelector({ selected, onChange }: IndicatorSelectorProps) {
  const handleToggle = (id: ComparatifIndicatorId) => {
    if (selected.includes(id)) {
      onChange(selected.filter(s => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          Colonnes ({selected.length})
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b border-border">
          <p className="font-medium text-sm">Indicateurs à afficher</p>
          <div className="flex gap-2 mt-2">
            <Button variant="ghost" size="sm" onClick={() => onChange(COMPARATIF_INDICATORS.map(i => i.id))}>
              Tout
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onChange(getDefaultVisibleIndicators())}>
              Par défaut
            </Button>
          </div>
        </div>
        <ScrollArea className="max-h-[400px]">
          <div className="p-2">
            {INDICATOR_GROUPS.map(group => (
              <div key={group} className="mb-3">
                <p className="text-xs font-semibold text-muted-foreground px-2 mb-1">{group}</p>
                {getIndicatorsByGroup(group).map(indicator => (
                  <div
                    key={indicator.id}
                    onClick={() => handleToggle(indicator.id)}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-muted",
                      selected.includes(indicator.id) && "bg-helpconfort-blue/10"
                    )}
                  >
                    <Checkbox
                      checked={selected.includes(indicator.id)}
                      className="pointer-events-none"
                    />
                    <span className="text-sm">{indicator.label}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export default function ComparatifAgencesPage() {
  const { dateRange } = useNetworkFilters();
  const { selectedAgencies } = useFranchiseur();
  
  const [visibleIndicators, setVisibleIndicators] = useState<ComparatifIndicatorId[]>(
    getDefaultVisibleIndicators()
  );
  const [pinnedAgencies, setPinnedAgencies] = useState<Set<string>>(new Set());

  const { data, isLoading, error } = useStatiaComparatifAgences({
    dateStart: dateRange.from,
    dateEnd: dateRange.to,
    scopeAgencies: selectedAgencies.length > 0 ? selectedAgencies : undefined,
  });

  const sortedAgences = useMemo(() => {
    if (!data?.agences) return [];
    return [...data.agences].sort((a, b) => {
      const aPinned = pinnedAgencies.has(a.agency_id);
      const bPinned = pinnedAgencies.has(b.agency_id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return a.agency_name.localeCompare(b.agency_name);
    });
  }, [data?.agences, pinnedAgencies]);

  const visibleIndicatorConfigs = useMemo(() => {
    return visibleIndicators
      .map(id => COMPARATIF_INDICATORS.find(c => c.id === id))
      .filter(Boolean) as typeof COMPARATIF_INDICATORS;
  }, [visibleIndicators]);

  const togglePin = (agencyId: string) => {
    setPinnedAgencies(prev => {
      const next = new Set(prev);
      if (next.has(agencyId)) {
        next.delete(agencyId);
      } else {
        next.add(agencyId);
      }
      return next;
    });
  };

  const handleExportCSV = () => {
    if (!data?.agences?.length) return;
    
    const headers = ['Agence', ...visibleIndicatorConfigs.map(i => i.label)];
    const rows = sortedAgences.map(row => [
      row.agency_name,
      ...visibleIndicatorConfigs.map(ind => {
        const val = row[ind.id as keyof ComparatifAgenceRow];
        return val === null || val === undefined ? '' : String(val);
      }),
    ]);
    
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `comparatif-agences-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  if (error) {
    return (
      <FranchiseurPageContainer>
        <Card className="rounded-2xl border-destructive">
          <CardContent className="p-6">
            <p className="text-destructive">Erreur lors du chargement des données</p>
          </CardContent>
        </Card>
      </FranchiseurPageContainer>
    );
  }

  return (
    <FranchiseurPageContainer maxWidth="full">
      <FranchiseurPageHeader
        title="Comparatif Agences"
        subtitle="Comparez les KPI de vos agences sur la période sélectionnée"
        icon={<TableProperties className="h-6 w-6 text-helpconfort-blue" />}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <NetworkPeriodSelector />
            <AgencySelector />
            <IndicatorSelector
              selected={visibleIndicators}
              onChange={setVisibleIndicators}
            />
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        }
      />

      {/* Table */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-lg">
            {isLoading ? 'Chargement...' : `${sortedAgences.length} agences`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="sticky left-0 bg-muted/50 z-10 min-w-[200px] font-semibold">Agence</TableHead>
                  {visibleIndicatorConfigs.map(ind => (
                    <TableHead key={ind.id} className="text-right whitespace-nowrap font-semibold">
                      {ind.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="sticky left-0 bg-card">
                        <Skeleton className="h-5 w-32" />
                      </TableCell>
                      {visibleIndicatorConfigs.map(ind => (
                        <TableCell key={ind.id} className="text-right">
                          <Skeleton className="h-5 w-16 ml-auto" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : sortedAgences.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={visibleIndicatorConfigs.length + 1} className="text-center py-8 text-muted-foreground">
                      Aucune agence trouvée
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedAgences.map(row => (
                    <TableRow
                      key={row.agency_id}
                      className={cn(
                        "hover:bg-muted/50",
                        pinnedAgencies.has(row.agency_id) && "bg-helpconfort-blue/5"
                      )}
                    >
                      <TableCell className="sticky left-0 bg-card z-10 font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => togglePin(row.agency_id)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {pinnedAgencies.has(row.agency_id) ? (
                              <PinOff className="h-4 w-4" />
                            ) : (
                              <Pin className="h-4 w-4" />
                            )}
                          </button>
                          {row.agency_name}
                        </div>
                      </TableCell>
                      {visibleIndicatorConfigs.map(ind => (
                        <TableCell key={ind.id} className="text-right tabular-nums">
                          {formatComparatifValue(
                            row[ind.id as keyof ComparatifAgenceRow] as number | null,
                            ind.format
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </FranchiseurPageContainer>
  );
}
