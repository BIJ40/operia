import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, Clock, FileX, CalendarX, ChevronRight, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { AlerteEntry } from '../../types/apporteur-stats-v2';

const ALERTE_CONFIG: Record<string, { icon: typeof AlertTriangle; label: string }> = {
  factures_retard_30j: { icon: Clock, label: 'Factures en retard +30j' },
  devis_non_valide_15j: { icon: FileX, label: 'Devis non validés +15j' },
  dossier_sans_rdv: { icon: CalendarX, label: 'Dossiers sans RDV' },
  dossier_sans_action_7j: { icon: Clock, label: 'Dossiers inactifs +7j' },
  rdv_annule: { icon: CalendarX, label: 'RDV annulés' },
  devis_refuse: { icon: FileX, label: 'Devis refusés' },
};

const SEVERITY_BADGE: Record<string, string> = {
  high: 'bg-[hsl(var(--ap-warning-light))] text-[hsl(var(--ap-warning))]',
  medium: 'bg-[hsl(var(--ap-warning-light))] text-[hsl(var(--ap-warning))]',
  low: 'bg-muted text-muted-foreground',
};

interface AlertesBannerProps {
  alertes: AlerteEntry[];
}

export function AlertesBanner({ alertes }: AlertesBannerProps) {
  const [, setSearchParams] = useSearchParams();
  const [openAlerte, setOpenAlerte] = useState<AlerteEntry | null>(null);
  
  const important = alertes.filter(a => a.severity === 'high' || a.severity === 'medium');
  if (important.length === 0) return null;

  const handleViewInDossiers = (refs: string[]) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('tab', 'dossiers');
      newParams.set('alerteRefs', refs.join(','));
      return newParams;
    });
    setOpenAlerte(null);
  };

  const openConf = openAlerte ? (ALERTE_CONFIG[openAlerte.type] || { icon: AlertTriangle, label: openAlerte.type }) : null;

  return (
    <>
      {/* Compact inline alerts — half-line style, no yellow background */}
      <div className="flex flex-wrap gap-2">
        {important.map((alerte) => {
          const conf = ALERTE_CONFIG[alerte.type] || { icon: AlertTriangle, label: alerte.type };
          const Icon = conf.icon;

          return (
            <button
              key={alerte.type}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-card text-sm cursor-pointer transition-all hover:shadow-sm hover:bg-muted/50"
              onClick={() => setOpenAlerte(alerte)}
            >
              <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="font-medium text-foreground">{conf.label}</span>
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-0.5">
                {alerte.count}
              </Badge>
              {alerte.amount ? (
                <span className="text-xs text-muted-foreground">
                  · {formatCurrency(alerte.amount)}
                </span>
              ) : null}
              <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
            </button>
          );
        })}
      </div>

      {/* Sheet détail alerte */}
      <Sheet open={!!openAlerte} onOpenChange={(open) => !open && setOpenAlerte(null)}>
        <SheetContent className="w-full sm:max-w-md">
          {openAlerte && openConf && (
            <>
              <SheetHeader className="pb-4">
                <SheetTitle className="flex items-center gap-2">
                  <openConf.icon className="w-5 h-5 text-muted-foreground" />
                  {openConf.label}
                </SheetTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={cn('text-xs', SEVERITY_BADGE[openAlerte.severity])}>
                    {openAlerte.severity === 'high' ? 'Critique' : openAlerte.severity === 'medium' ? 'Attention' : 'Info'}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {openAlerte.count} dossier(s)
                    {openAlerte.amount ? ` · ${formatCurrency(openAlerte.amount)}` : ''}
                  </span>
                </div>
              </SheetHeader>

              <div className="space-y-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleViewInDossiers(openAlerte.sample_refs)}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Filtrer dans l'onglet Dossiers
                </Button>

                <div className="text-sm font-medium text-muted-foreground">
                  Dossiers concernés ({openAlerte.sample_refs.length})
                </div>
                <ScrollArea className="h-[calc(100vh-280px)]">
                  <div className="space-y-1.5 pr-4">
                    {openAlerte.sample_refs.map((ref, idx) => {
                      const label = openAlerte.sample_labels?.[idx];
                      const displayName = label && label !== ref ? label : null;
                      
                      return (
                        <div
                          key={`${ref}-${idx}`}
                          className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                          onClick={() => {
                            setSearchParams(prev => {
                              const newParams = new URLSearchParams(prev);
                              newParams.set('tab', 'dossiers');
                              newParams.set('alerteRefs', ref);
                              return newParams;
                            });
                            setOpenAlerte(null);
                          }}
                        >
                          <div className="min-w-0 flex-1">
                            <span className="text-sm font-medium truncate block">
                              {displayName || `Dossier ${ref}`}
                            </span>
                            {displayName && (
                              <span className="text-xs text-muted-foreground font-mono">{ref}</span>
                            )}
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-2" />
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
