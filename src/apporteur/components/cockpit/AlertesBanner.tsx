import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, FileX, CalendarX, ChevronRight, Info, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DocDownloadButton } from '@/apporteur/components/DocDownloadButton';
import type { AlerteEntry } from '../../types/apporteur-stats-v2';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const ALERTE_CONFIG: Record<string, { icon: typeof AlertTriangle; label: string; description: string }> = {
  factures_retard_30j: {
    icon: Clock,
    label: 'Factures en retard +30j',
    description: 'Ces factures ont été émises il y a plus de 30 jours et n\'ont pas encore été réglées.',
  },
  devis_non_valide_15j: {
    icon: FileX,
    label: 'Devis non validés +15j',
    description: 'Ces devis ont été envoyés il y a plus de 15 jours et sont toujours en attente de validation.',
  },
  dossier_sans_rdv: {
    icon: CalendarX,
    label: 'Dossiers sans RDV',
    description: 'Ces dossiers n\'ont pas encore de rendez-vous planifié.',
  },
  dossier_sans_action_7j: {
    icon: Clock,
    label: 'Dossiers inactifs +7j',
    description: 'Aucune activité n\'a été enregistrée sur ces dossiers depuis plus de 7 jours.',
  },
  rdv_annule: {
    icon: CalendarX,
    label: 'RDV annulés',
    description: 'Des rendez-vous ont été annulés sur ces dossiers.',
  },
  devis_refuse: {
    icon: FileX,
    label: 'Devis refusés',
    description: 'Des devis ont été refusés par le client sur ces dossiers.',
  },
};

const SEVERITY_BADGE: Record<string, string> = {
  high: 'bg-destructive/10 text-destructive border-destructive/20',
  medium: 'bg-[hsl(var(--ap-warning-light))] text-[hsl(var(--ap-warning))] border-[hsl(var(--ap-warning))]/20',
  low: 'bg-muted text-muted-foreground border-border',
};

const SEVERITY_LABEL: Record<string, string> = {
  high: 'Critique',
  medium: 'Attention',
  low: 'Info',
};

interface AlertesBannerProps {
  alertes: AlerteEntry[];
}

export function AlertesBanner({ alertes }: AlertesBannerProps) {
  const navigate = useNavigate();
  const [openAlerte, setOpenAlerte] = useState<AlerteEntry | null>(null);

  const important = alertes.filter(a => a.severity === 'high' || a.severity === 'medium');
  if (important.length === 0) return null;

  const openConf = openAlerte
    ? (ALERTE_CONFIG[openAlerte.type] || { icon: AlertTriangle, label: openAlerte.type, description: '' })
    : null;

  const hasDetails = openAlerte?.sample_details && openAlerte.sample_details.length > 0;
  const isFactureAlert = openAlerte?.type === 'factures_retard_30j';
  const isDevisAlert = openAlerte?.type === 'devis_non_valide_15j' || openAlerte?.type === 'devis_refuse';

  return (
    <>
      {/* Compact inline alerts */}
      <div className="flex flex-wrap gap-2">
        {important.map((alerte) => {
          const conf = ALERTE_CONFIG[alerte.type] || { icon: AlertTriangle, label: alerte.type, description: '' };
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

      {/* Dialog détail alerte — élargi avec tableau */}
      <Dialog open={!!openAlerte} onOpenChange={(open) => !open && setOpenAlerte(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
          {openAlerte && openConf && (
            <>
              {/* Header */}
              <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/30">
                <DialogTitle className="flex items-center gap-2.5 text-base">
                  <div className="p-1.5 rounded-md bg-background border">
                    <openConf.icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  {openConf.label}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-3">
                  <Badge
                    variant="outline"
                    className={cn('text-xs', SEVERITY_BADGE[openAlerte.severity])}
                  >
                    {SEVERITY_LABEL[openAlerte.severity] || openAlerte.severity}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {openAlerte.count} dossier{openAlerte.count !== 1 ? 's' : ''}
                    {openAlerte.amount ? ` · ${formatCurrency(openAlerte.amount)}` : ''}
                  </span>
                </div>
                {openConf.description && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    {openConf.description}
                  </p>
                )}
              </DialogHeader>

              {/* Content — table enrichie */}
              <div className="flex-1 min-h-0 px-6 py-4">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Dossiers concernés
                </div>
                <ScrollArea className="h-[min(450px,55vh)]">
                  {hasDetails ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs text-muted-foreground uppercase tracking-wide">
                          <th className="pb-2 pr-3 font-medium">Dossier</th>
                          <th className="pb-2 pr-3 font-medium">Réf.</th>
                          {(isFactureAlert || isDevisAlert) && (
                            <th className="pb-2 pr-3 font-medium">Date</th>
                          )}
                          {(isFactureAlert || isDevisAlert) && (
                            <th className="pb-2 pr-3 font-medium text-right">Montant HT</th>
                          )}
                          {isFactureAlert && (
                            <th className="pb-2 pr-3 font-medium text-right">Retard</th>
                          )}
                          <th className="pb-2 font-medium text-center">PDF</th>
                        </tr>
                      </thead>
                      <tbody>
                        {openAlerte.sample_details!.map((detail, idx) => (
                          <tr
                            key={`${detail.ref}-${idx}`}
                            className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                            onClick={() => {
                              setOpenAlerte(null);
                              navigate(`/apporteur/dashboard?tab=dossiers&search=${detail.ref}`);
                            }}
                          >
                            <td className="py-2.5 pr-3 font-medium text-foreground max-w-[180px] truncate">
                              <span className="hover:underline">{detail.label || `Dossier ${detail.ref}`}</span>
                            </td>
                            <td className="py-2.5 pr-3 text-muted-foreground font-mono text-xs">
                              {detail.ref}
                            </td>
                            {(isFactureAlert || isDevisAlert) && (
                              <td className="py-2.5 pr-3 text-muted-foreground text-xs whitespace-nowrap">
                                {detail.date
                                  ? format(parseISO(detail.date), 'dd MMM yyyy', { locale: fr })
                                  : '—'}
                              </td>
                            )}
                            {(isFactureAlert || isDevisAlert) && (
                              <td className="py-2.5 pr-3 text-right tabular-nums">
                                {detail.amount ? formatCurrency(Math.round(detail.amount)) : '—'}
                              </td>
                            )}
                            {isFactureAlert && (
                              <td className="py-2.5 pr-3 text-right text-xs">
                                <span className={cn(
                                  'font-medium',
                                  (detail.days || 0) > 60 ? 'text-destructive' : 'text-[hsl(var(--ap-warning))]'
                                )}>
                                  {Math.round(detail.days || 0)}j
                                </span>
                              </td>
                            )}
                            <td className="py-2.5 text-center">
                              <DocDownloadButton
                                dossierRef={detail.ref}
                                docType={isFactureAlert ? 'factures' : 'devis'}
                                className="mx-auto"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    /* Fallback pour alertes sans details enrichis */
                    <div className="space-y-1 pr-2">
                      {openAlerte.sample_refs.map((ref, idx) => {
                        const label = openAlerte.sample_labels?.[idx];
                        const displayName = label && label !== ref ? label : null;

                        return (
                          <div
                            key={`${ref}-${idx}`}
                            className="flex items-center justify-between py-2.5 px-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                          >
                            <div className="min-w-0 flex-1">
                              <span className="text-sm font-medium truncate block text-foreground">
                                {displayName || `Dossier ${ref}`}
                              </span>
                              <span className="text-xs text-muted-foreground font-mono">
                                Réf. {ref}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
