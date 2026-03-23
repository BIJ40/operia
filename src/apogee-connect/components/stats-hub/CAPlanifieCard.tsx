/**
 * CAPlanifieCard - Carte CA Planifié avec sélecteur de mois intégré
 * Clic → ouvre le détail dans une popup
 */

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Euro, FolderOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, startOfMonth, endOfMonth, setMonth, setYear, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { CAPlanifieDetailDialog } from './CAPlanifieDetailDialog';

const formatCurrency = (value: number): string => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M€`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k€`;
  return `${Math.round(value)}€`;
};

const toDate = (v: unknown): Date | null => {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === 'number') { const d = new Date(v); return isNaN(d.getTime()) ? null : d; }
  if (typeof v === 'string') { const d = new Date(v); return isNaN(d.getTime()) ? null : d; }
  return null;
};

const getProjectId = (obj: any): number | null => {
  const raw = obj?.projectId ?? obj?.project_id ?? obj?.project?.id;
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

const getInterventionPlanningDate = (itv: any): Date | null => {
  const direct = toDate(itv?.dateReelle ?? itv?.date);
  if (direct) return direct;
  const visites = Array.isArray(itv?.visites) ? itv.visites : [];
  for (const v of visites) {
    const dv = toDate(v?.dateReelle ?? v?.date);
    if (dv) return dv;
  }
  return null;
};

const VALID_DEVIS_STATES = new Set([
  'to order', 'to_order', 'order',
  'accepted', 'signed', 'validated',
  'commande', 'commandé', 'à commander',
  'devis_accepte', 'devis_valide',
]);

const isDevisToOrder = (d: any): boolean => {
  const state = String(d?.state ?? d?.status ?? d?.data?.state ?? '').trim().toLowerCase();
  return VALID_DEVIS_STATES.has(state);
};

const parseNumericValue = (value: any): number => {
  if (value == null) return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  if (typeof value === 'string') { const n = parseFloat(value.replace(',', '.').trim()); return isNaN(n) ? 0 : n; }
  return 0;
};

interface CAPlanifieCardProps {
  projects: any[];
  interventions: any[];
  devis: any[];
  factures: any[];
}

const MONTHS = [
  { value: 0, label: 'Janvier' }, { value: 1, label: 'Février' }, { value: 2, label: 'Mars' },
  { value: 3, label: 'Avril' }, { value: 4, label: 'Mai' }, { value: 5, label: 'Juin' },
  { value: 6, label: 'Juillet' }, { value: 7, label: 'Août' }, { value: 8, label: 'Septembre' },
  { value: 9, label: 'Octobre' }, { value: 10, label: 'Novembre' }, { value: 11, label: 'Décembre' },
];

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export function CAPlanifieCard({ projects, interventions, devis, factures }: CAPlanifieCardProps) {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [dialogOpen, setDialogOpen] = useState(false);

  const selectedPeriod = useMemo(() => {
    const targetDate = setYear(setMonth(new Date(), selectedMonth), selectedYear);
    return {
      start: startOfMonth(targetDate),
      end: endOfMonth(targetDate),
      label: format(targetDate, 'MMMM yyyy', { locale: fr })
    };
  }, [selectedMonth, selectedYear]);

  const { caPlanifie, caPlanifieDevisCount } = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    const periodStartMonth = `${selectedPeriod.start.getFullYear()}-${String(selectedPeriod.start.getMonth() + 1).padStart(2, '0')}`;
    const periodEndMonth = `${selectedPeriod.end.getFullYear()}-${String(selectedPeriod.end.getMonth() + 1).padStart(2, '0')}`;

    const facturedProjectIds = new Set<number>();
    for (const f of factures) { const pid = getProjectId(f); if (pid != null) facturedProjectIds.add(pid); }

    const interventionsByProjectId = new Map<number, any[]>();
    for (const itv of interventions) { const pid = getProjectId(itv); if (pid == null) continue; if (!interventionsByProjectId.has(pid)) interventionsByProjectId.set(pid, []); interventionsByProjectId.get(pid)!.push(itv); }

    const devisByProjectId = new Map<number, any[]>();
    for (const d of devis) { const pid = getProjectId(d); if (pid == null) continue; if (!devisByProjectId.has(pid)) devisByProjectId.set(pid, []); devisByProjectId.get(pid)!.push(d); }

    let total = 0;
    let count = 0;

    for (const project of projects) {
      const projectId = Number(project?.id);
      if (!Number.isFinite(projectId)) continue;
      if (facturedProjectIds.has(projectId)) continue;

      const projectInterventions = interventionsByProjectId.get(projectId) || [];

      // Phase A : compter les interventions futures par mois
      const monthCounts = new Map<string, number>();
      for (const itv of projectInterventions) {
        const d = getInterventionPlanningDate(itv);
        if (d && d.getTime() >= todayMs) {
          const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          monthCounts.set(mk, (monthCounts.get(mk) || 0) + 1);
        }
      }

      if (monthCounts.size === 0) continue;

      // Phase B : mois dominant
      let dominantMonth = '';
      let dominantCount = 0;
      for (const [month, cnt] of monthCounts) {
        if (cnt > dominantCount || (cnt === dominantCount && month < dominantMonth)) {
          dominantMonth = month;
          dominantCount = cnt;
        }
      }

      // Phase C : ne retenir que si le mois dominant est dans la période
      if (!dominantMonth || dominantMonth < periodStartMonth || dominantMonth > periodEndMonth) continue;

      const projectDevis = devisByProjectId.get(projectId) || [];
      for (const d of projectDevis) {
        if (!isDevisToOrder(d)) continue;
        const montant = parseNumericValue(d.data?.totalHT) || parseNumericValue(d.totalHT) || parseNumericValue(d.amount) || 0;
        if (montant > 0) { total += montant; count++; break; }
      }
    }

    return { caPlanifie: total, caPlanifieDevisCount: count };
  }, [projects, interventions, devis, factures, selectedPeriod.start, selectedPeriod.end]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newDate = addMonths(setYear(setMonth(new Date(), selectedMonth), selectedYear), -1);
    setSelectedMonth(newDate.getMonth());
    setSelectedYear(newDate.getFullYear());
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newDate = addMonths(setYear(setMonth(new Date(), selectedMonth), selectedYear), 1);
    setSelectedMonth(newDate.getMonth());
    setSelectedYear(newDate.getFullYear());
  };

  return (
    <>
      <motion.div variants={itemVariants}>
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card
                className="border-l-4 bg-warm-green/10 cursor-pointer hover:shadow-md transition-shadow"
                style={{ borderLeftColor: 'hsl(145, 60%, 55%)' }}
                onClick={() => setDialogOpen(true)}
              >
                <div className="flex items-start justify-between p-4 pb-2">
                  <h4 className="text-sm font-medium text-muted-foreground">CA Planifié</h4>
                  <Euro className="h-4 w-4 text-warm-green" />
                </div>
                <div className="px-4 pb-4">
                  <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground mb-1">
                    <Button variant="ghost" size="icon" className="h-4 w-4 p-0" onClick={handlePrevMonth}>
                      <ChevronLeft className="h-2.5 w-2.5" />
                    </Button>
                    <span className="font-medium">{MONTHS[selectedMonth].label.slice(0, 3)}. {selectedYear}</span>
                    <Button variant="ghost" size="icon" className="h-4 w-4 p-0" onClick={handleNextMonth}>
                      <ChevronRight className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="flex-1">
                      <div className="text-2xl font-bold text-foreground">{formatCurrency(caPlanifie)}</div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <FolderOpen className="h-3 w-3" />
                        <span>{caPlanifieDevisCount} dossiers</span>
                      </div>
                    </div>
                    <div className="w-24 h-14 flex-shrink-0" />
                  </div>
                </div>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="p-4 max-w-xs">
              <div className="space-y-2">
                <p className="font-medium">CA Planifié = Σ devis "to order"</p>
                <p className="text-xs text-muted-foreground">
                  Cliquez pour voir le détail des dossiers planifiés sur <strong>{selectedPeriod.label}</strong>.
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </motion.div>

      <CAPlanifieDetailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projects={projects}
        interventions={interventions}
        devis={devis}
        factures={factures}
        periodStart={selectedPeriod.start}
        periodEnd={selectedPeriod.end}
        periodLabel={selectedPeriod.label}
      />
    </>
  );
}
