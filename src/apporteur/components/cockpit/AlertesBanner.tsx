import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
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

const SEVERITY_STYLES: Record<string, string> = {
  high: 'border-rose-300 bg-rose-50 dark:bg-rose-950/20',
  medium: 'border-amber-300 bg-amber-50 dark:bg-amber-950/20',
  low: 'border-slate-200 bg-slate-50 dark:bg-slate-900/20',
};

const SEVERITY_BADGE: Record<string, string> = {
  high: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  low: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
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
      <div className="space-y-2">
        {important.map((alerte) => {
          const conf = ALERTE_CONFIG[alerte.type] || { icon: AlertTriangle, label: alerte.type };
          const Icon = conf.icon;
          const style = SEVERITY_STYLES[alerte.severity] || SEVERITY_STYLES.low;

          return (
            <Card
              key={alerte.type}
              className={cn('rounded-xl border cursor-pointer transition-all hover:shadow-md hover:scale-[1.01]', style)}
              onClick={() => setOpenAlerte(alerte)}
            >
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <Icon className={cn(
                    'w-4 h-4 shrink-0',
                    alerte.severity === 'high' ? 'text-rose-600' : 'text-amber-600'
                  )} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground">
                      {conf.label}
                    </span>
                    <span className="text-sm text-muted-foreground ml-2">
                      — {alerte.count} dossier(s)
                      {alerte.amount ? ` · ${formatCurrency(alerte.amount)}` : ''}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
              </CardContent>
            </Card>
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
                  <openConf.icon className={cn(
                    'w-5 h-5',
                    openAlerte.severity === 'high' ? 'text-rose-600' : 'text-amber-600'
                  )} />
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
                {/* Bouton "Voir dans Dossiers" */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleViewInDossiers(openAlerte.sample_refs)}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Filtrer dans l'onglet Dossiers
                </Button>

                {/* Liste des dossiers concernés */}
                <div className="text-sm font-medium text-muted-foreground">
                  Dossiers concernés ({openAlerte.sample_refs.length})
                </div>
                <ScrollArea className="h-[calc(100vh-280px)]">
                  <div className="space-y-1.5 pr-4">
                    {openAlerte.sample_refs.map((ref, idx) => (
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
                        <span className="font-mono text-sm font-medium">{ref}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    ))}
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
