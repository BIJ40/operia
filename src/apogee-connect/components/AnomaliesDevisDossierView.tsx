/**
 * Vue de détection des incohérences devis / dossier.
 */
import { useState } from 'react';
import { AlertTriangle, AlertOctagon, Loader2, Search, FileWarning, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAnomaliesDevisDossier, getAnomalySeverity } from '@/apogee-connect/hooks/useAnomaliesDevisDossier';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

type SeverityFilter = 'all' | 'critical' | 'warning';

export default function AnomaliesDevisDossierView() {
  const { anomalies, stats, isLoading } = useAnomaliesDevisDossier();
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary/60" />
      </div>
    );
  }

  const filtered = anomalies.filter(a => {
    if (severityFilter !== 'all' && getAnomalySeverity(a.projectState) !== severityFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        a.projectRef.toLowerCase().includes(q) ||
        a.projectLabel.toLowerCase().includes(q) ||
        a.clientName.toLowerCase().includes(q) ||
        a.reason.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className={cn(stats.total === 0 && "border-emerald-500/30")}>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total anomalies</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className={cn("text-2xl font-bold", stats.total === 0 ? "text-emerald-600" : "text-foreground")}>
              {stats.total === 0 ? '✓ 0' : stats.total}
            </p>
          </CardContent>
        </Card>
        <Card className={cn(stats.critical > 0 && "border-destructive/40")}>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <AlertOctagon className="w-3.5 h-3.5 text-destructive" /> Critiques
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className={cn("text-2xl font-bold", stats.critical > 0 && "text-destructive")}>{stats.critical}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Avertissements
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-2xl font-bold">{stats.warning}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Montant impacté</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-2xl font-bold text-primary">{formatCurrency(stats.totalHT)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher dossier, client, raison..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex gap-1.5">
          {([
            { value: 'all' as SeverityFilter, label: 'Tous', count: stats.total },
            { value: 'critical' as SeverityFilter, label: 'Critiques', count: stats.critical, icon: <AlertOctagon className="w-3.5 h-3.5" /> },
            { value: 'warning' as SeverityFilter, label: 'Avertissements', count: stats.warning, icon: <AlertTriangle className="w-3.5 h-3.5" /> },
          ]).map(opt => (
            <Button
              key={opt.value}
              variant={severityFilter === opt.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSeverityFilter(opt.value)}
              className="h-8 text-xs gap-1"
            >
              {opt.icon}
              {opt.label}
              <span className={cn(
                "ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                severityFilter === opt.value
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}>
                {opt.count}
              </span>
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Réf. dossier</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Statut dossier</TableHead>
                <TableHead>Statut devis</TableHead>
                <TableHead className="text-right">Montant HT</TableHead>
                <TableHead className="hidden md:table-cell">Raison</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <FileWarning className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    {stats.total === 0
                      ? 'Aucune incohérence détectée — tout est cohérent ✓'
                      : 'Aucune anomalie ne correspond au filtre'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((a, i) => {
                  const severity = getAnomalySeverity(a.projectState);
                  const isCritical = severity === 'critical';
                  return (
                    <TableRow
                      key={`${a.devisId}-${i}`}
                      className={cn(
                        isCritical && "bg-destructive/5 hover:bg-destructive/10",
                        !isCritical && "hover:bg-muted/60"
                      )}
                    >
                      <TableCell className="text-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              {isCritical
                                ? <AlertOctagon className="w-4 h-4 text-destructive" />
                                : <AlertTriangle className="w-4 h-4 text-amber-500" />
                              }
                            </TooltipTrigger>
                            <TooltipContent>
                              {isCritical ? 'Anomalie critique' : 'Avertissement'}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div>{a.projectRef}</div>
                        {a.projectLabel && (
                          <div className="text-xs text-muted-foreground truncate max-w-[180px]">{a.projectLabel}</div>
                        )}
                      </TableCell>
                      <TableCell>{a.clientName}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[11px]",
                            isCritical ? "border-destructive/50 text-destructive" : "border-amber-400/50 text-amber-700 dark:text-amber-400"
                          )}
                        >
                          {a.projectStateLabel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[11px]">
                          {a.devisStateLabel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(a.devisHT)}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[300px]">
                        {a.reason}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
