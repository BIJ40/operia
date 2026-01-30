/**
 * CAPlanifieCard - Carte CA Planifié avec sélecteur de mois intégré
 * Le sélecteur de période est DANS la carte pour éviter toute confusion
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Euro, FolderOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, startOfMonth, endOfMonth, setMonth, setYear, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';

const formatCurrency = (value: number): string => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M€`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k€`;
  return `${Math.round(value)}€`;
};

// Helpers pour le calcul du CA Planifié
const toDate = (v: unknown): Date | null => {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === 'number') {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === 'string') {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
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

const isDevisToOrder = (d: any): boolean => {
  const state = String(d?.state ?? d?.status ?? d?.data?.state ?? '').trim().toLowerCase();
  return state === 'to order' || state === 'to_order' || state === 'order';
};

const parseNumericValue = (value: any): number => {
  if (value == null) return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  if (typeof value === 'string') {
    const cleaned = value.replace(',', '.').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
};

interface CAPlanifieCardProps {
  projects: any[];
  interventions: any[];
  devis: any[];
  factures: any[];
}

const MONTHS = [
  { value: 0, label: 'Janvier' },
  { value: 1, label: 'Février' },
  { value: 2, label: 'Mars' },
  { value: 3, label: 'Avril' },
  { value: 4, label: 'Mai' },
  { value: 5, label: 'Juin' },
  { value: 6, label: 'Juillet' },
  { value: 7, label: 'Août' },
  { value: 8, label: 'Septembre' },
  { value: 9, label: 'Octobre' },
  { value: 10, label: 'Novembre' },
  { value: 11, label: 'Décembre' },
];

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export function CAPlanifieCard({ projects, interventions, devis, factures }: CAPlanifieCardProps) {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  // Calculer la période sélectionnée
  const selectedPeriod = useMemo(() => {
    const targetDate = setYear(setMonth(new Date(), selectedMonth), selectedYear);
    return {
      start: startOfMonth(targetDate),
      end: endOfMonth(targetDate),
      label: format(targetDate, 'MMMM yyyy', { locale: fr })
    };
  }, [selectedMonth, selectedYear]);

  // Calculer le CA Planifié pour la période sélectionnée
  const { caPlanifie, caPlanifieDevisCount } = useMemo(() => {
    const startMs = selectedPeriod.start.getTime();
    const endMs = selectedPeriod.end.getTime();

    // Créer un Set des projectIds déjà facturés
    const facturedProjectIds = new Set<number>();
    for (const f of factures) {
      const pid = getProjectId(f);
      if (pid != null) facturedProjectIds.add(pid);
    }

    // Indexer les interventions par projectId
    const interventionsByProjectId = new Map<number, any[]>();
    for (const itv of interventions) {
      const pid = getProjectId(itv);
      if (pid == null) continue;
      if (!interventionsByProjectId.has(pid)) interventionsByProjectId.set(pid, []);
      interventionsByProjectId.get(pid)!.push(itv);
    }

    // Indexer les devis par projectId
    const devisByProjectId = new Map<number, any[]>();
    for (const d of devis) {
      const pid = getProjectId(d);
      if (pid == null) continue;
      if (!devisByProjectId.has(pid)) devisByProjectId.set(pid, []);
      devisByProjectId.get(pid)!.push(d);
    }

    let total = 0;
    let count = 0;

    for (const project of projects) {
      const projectId = Number(project?.id);
      if (!Number.isFinite(projectId)) continue;

      // Exclure les projets déjà facturés
      if (facturedProjectIds.has(projectId)) continue;

      // Vérifier si ce projet a une intervention planifiée dans la période
      const projectInterventions = interventionsByProjectId.get(projectId) || [];
      const hasInterventionInPeriod = projectInterventions.some((itv) => {
        const planningDate = getInterventionPlanningDate(itv);
        if (!planningDate) return false;
        const t = planningDate.getTime();
        return t >= startMs && t <= endMs;
      });

      if (!hasInterventionInPeriod) continue;

      // Chercher un devis "to order" pour ce projet
      const projectDevis = devisByProjectId.get(projectId) || [];
      for (const d of projectDevis) {
        if (!isDevisToOrder(d)) continue;
        const montant =
          parseNumericValue(d.data?.totalHT) ||
          parseNumericValue(d.totalHT) ||
          parseNumericValue(d.amount) ||
          0;
        if (montant > 0) {
          total += montant;
          count++;
          break; // 1 seul devis to_order par projet
        }
      }
    }

    return { caPlanifie: total, caPlanifieDevisCount: count };
  }, [projects, interventions, devis, factures, selectedPeriod.start, selectedPeriod.end]);

  const handlePrevMonth = () => {
    const newDate = addMonths(setYear(setMonth(new Date(), selectedMonth), selectedYear), -1);
    setSelectedMonth(newDate.getMonth());
    setSelectedYear(newDate.getFullYear());
  };

  const handleNextMonth = () => {
    const newDate = addMonths(setYear(setMonth(new Date(), selectedMonth), selectedYear), 1);
    setSelectedMonth(newDate.getMonth());
    setSelectedYear(newDate.getFullYear());
  };

  return (
    <motion.div variants={itemVariants}>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="border-l-4 bg-warm-green/10 cursor-help" style={{ borderLeftColor: 'hsl(145, 60%, 55%)' }}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">CA Planifié</CardTitle>
                <Euro className="h-5 w-5 text-warm-green" />
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Sélecteur de mois compact */}
                <div className="flex items-center gap-1 bg-background/80 rounded-md p-1 border border-border/50">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6" 
                    onClick={(e) => { e.stopPropagation(); handlePrevMonth(); }}
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <Select 
                    value={selectedMonth.toString()} 
                    onValueChange={(v) => setSelectedMonth(parseInt(v))}
                  >
                    <SelectTrigger 
                      className="h-6 border-0 shadow-none bg-transparent text-xs font-medium px-1 w-auto min-w-[70px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map(m => (
                        <SelectItem key={m.value} value={m.value.toString()} className="text-xs">
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select 
                    value={selectedYear.toString()} 
                    onValueChange={(v) => setSelectedYear(parseInt(v))}
                  >
                    <SelectTrigger 
                      className="h-6 border-0 shadow-none bg-transparent text-xs font-medium px-1 w-auto min-w-[50px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1, now.getFullYear() + 2].map(y => (
                        <SelectItem key={y} value={y.toString()} className="text-xs">
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6" 
                    onClick={(e) => { e.stopPropagation(); handleNextMonth(); }}
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>

                {/* Valeur */}
                <div className="text-3xl font-bold text-warm-green">{formatCurrency(caPlanifie)}</div>
                <p className="text-sm text-muted-foreground">devis acceptés</p>
                <div className="flex gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <FolderOpen className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">{caPlanifieDevisCount}</span>
                    <span className="text-muted-foreground">dossiers</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="p-4 max-w-xs">
            <div className="space-y-2">
              <p className="font-medium">CA Planifié = Σ devis "to order"</p>
              <p className="text-xs text-muted-foreground">
                Somme des montants HT des devis acceptés (status = "to order") 
                pour les dossiers avec interventions planifiées sur <strong>{selectedPeriod.label}</strong>.
              </p>
              <p className="text-xs text-muted-foreground">
                1 seul devis comptabilisé par dossier (pas de double comptage).
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </motion.div>
  );
}
