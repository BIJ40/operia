/**
 * PlanningGrid - Vue grille hebdomadaire Lun→Ven (5 colonnes, sans samedi)
 * Timeline horaire 8h–18h avec compatibilité visuelle
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Calendar, ChevronLeft, ChevronRight, Loader2, Settings2 } from 'lucide-react';
import { format, addDays, addWeeks, isSameDay, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { EnrichedCreneau } from '@/shared/api/apogee/usePlanningData';
import { TechDrawer } from './TechDrawer';

// ============================================================================
// CONSTANTS — Lun→Ven uniquement, 8h–18h
// ============================================================================

const DAY_START_HOUR = 8;
const DAY_END_HOUR = 18;
const TOTAL_HOURS = DAY_END_HOUR - DAY_START_HOUR;
const HOUR_HEIGHT_PX = 48;
const TIMELINE_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT_PX;
const WEEK_DAYS_COUNT = 5; // Lun→Ven

// ============================================================================
// TYPES
// ============================================================================

interface TechInfo {
  id: number;
  label: string;
  color?: string;
  type?: string;
  collaboratorId?: string;
}

interface PlanningGridProps {
  technicians: TechInfo[];
  creneaux: EnrichedCreneau[];
  isLoading: boolean;
  weekStart: Date;
  onWeekChange: (date: Date) => void;
  isCompatible?: (techId: number) => boolean | null;
  getMatchedCompetences?: (techId: number) => string[];
}

// ============================================================================
// HELPERS
// ============================================================================

function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: WEEK_DAYS_COUNT }, (_, i) => addDays(weekStart, i));
}

function parseDateSafe(dateStr: string): Date | null {
  if (!dateStr) return null;
  try { return parseISO(dateStr); } catch { return null; }
}

function getCreneauColor(refType: string, interventionType?: string): { bg: string; border: string; text: string } {
  const rt = (refType || '').toLowerCase();
  const it = (interventionType || '').toLowerCase();

  if (rt === 'conge') return { bg: 'bg-red-100 dark:bg-red-900/30', border: 'border-red-300 dark:border-red-800', text: 'text-red-800 dark:text-red-200' };
  if (rt === 'rappel') return { bg: 'bg-yellow-100 dark:bg-yellow-900/30', border: 'border-yellow-300 dark:border-yellow-800', text: 'text-yellow-800 dark:text-yellow-200' };
  if (it.includes('rt') || it.includes('releve') || it.includes('rdv')) return { bg: 'bg-amber-100 dark:bg-amber-900/30', border: 'border-amber-300 dark:border-amber-800', text: 'text-amber-900 dark:text-amber-200' };
  if (it.includes('tvx') || it.includes('travaux')) return { bg: 'bg-purple-100 dark:bg-purple-900/30', border: 'border-purple-300 dark:border-purple-800', text: 'text-purple-900 dark:text-purple-200' };
  if (it.includes('dep') || it.includes('depannage')) return { bg: 'bg-orange-100 dark:bg-orange-900/30', border: 'border-orange-300 dark:border-orange-800', text: 'text-orange-900 dark:text-orange-200' };
  if (it.includes('sav')) return { bg: 'bg-pink-100 dark:bg-pink-900/30', border: 'border-pink-300 dark:border-pink-800', text: 'text-pink-900 dark:text-pink-200' };
  return { bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-300 dark:border-blue-800', text: 'text-blue-900 dark:text-blue-200' };
}

function getCreneauPosition(dateStr: string, dureeMin: number) {
  const d = parseDateSafe(dateStr);
  if (!d) return null;
  const h = d.getHours() + d.getMinutes() / 60;
  const startOffset = h - DAY_START_HOUR;
  if (startOffset < 0 || startOffset >= TOTAL_HOURS) return null;
  return { topPx: startOffset * HOUR_HEIGHT_PX, heightPx: Math.max((dureeMin / 60) * HOUR_HEIGHT_PX, 16) };
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function TimeScale() {
  const hours = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => DAY_START_HOUR + i);
  return (
    <div className="relative shrink-0" style={{ width: 36, height: TIMELINE_HEIGHT }}>
      {hours.map((h, i) => (
        <div key={h} className="absolute left-0 right-0 text-[10px] text-muted-foreground text-right pr-1" style={{ top: i * HOUR_HEIGHT_PX - 6 }}>{h}h</div>
      ))}
    </div>
  );
}

function HourLines() {
  return <>{Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
    <div key={i} className="absolute left-0 right-0 border-t border-border/30" style={{ top: i * HOUR_HEIGHT_PX }} />
  ))}</>;
}

function CreneauBlock({ creneau }: { creneau: EnrichedCreneau }) {
  const pos = getCreneauPosition(creneau.date, creneau.duree);
  if (!pos) return null;
  const colors = getCreneauColor(creneau.refType, creneau.interventionType);
  const startDate = parseDateSafe(creneau.date);
  const timeLabel = startDate ? format(startDate, 'HH:mm') : '';
  const label = creneau.refType === 'conge' ? 'Congé' : creneau.refType === 'rappel' ? 'Rappel' : creneau.projectRef || creneau.interventionType || creneau.refType;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`absolute left-0.5 right-0.5 rounded border px-1 overflow-hidden cursor-default ${colors.bg} ${colors.border}`} style={{ top: pos.topPx, height: pos.heightPx }}>
            <div className={`text-[9px] font-semibold truncate leading-tight pt-0.5 ${colors.text}`}>{timeLabel} {label}</div>
            {pos.heightPx > 28 && creneau.clientName && <div className={`text-[8px] truncate opacity-70 ${colors.text}`}>{creneau.clientName}</div>}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="whitespace-pre-line text-xs max-w-xs">
          {[`${timeLabel} (${creneau.duree}min)`, creneau.projectRef && `Dossier: ${creneau.projectRef}`, creneau.interventionType && `Type: ${creneau.interventionType}`, creneau.clientName && `Client: ${creneau.clientName}`, creneau.clientCity && `Ville: ${creneau.clientCity}`].filter(Boolean).join('\n')}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function DayColumn({ creneaux }: { creneaux: EnrichedCreneau[] }) {
  return (
    <div className="relative border-l border-border/20" style={{ height: TIMELINE_HEIGHT }}>
      <HourLines />
      {creneaux.map((c, i) => <CreneauBlock key={`${c.id}-${i}`} creneau={c} />)}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PlanningGrid({ technicians, creneaux, isLoading, weekStart, onWeekChange, isCompatible, getMatchedCompetences }: PlanningGridProps) {
  const [selectedTechId, setSelectedTechId] = useState<number | null>(null);
  const [drawerTech, setDrawerTech] = useState<TechInfo | null>(null);
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);

  const activeTechId = selectedTechId ?? technicians[0]?.id ?? null;

  const creneauxByTechDay = useMemo(() => {
    const map = new Map<string, EnrichedCreneau[]>();
    for (const c of creneaux) {
      const d = parseDateSafe(c.date);
      if (!d) continue;
      for (const uid of c.usersIds) {
        for (const day of weekDays) {
          if (isSameDay(d, day)) {
            const key = `${uid}-${format(day, 'yyyy-MM-dd')}`;
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(c);
          }
        }
      }
    }
    return map;
  }, [creneaux, weekDays]);

  const techStats = useMemo(() => {
    if (!activeTechId) return { count: 0, minutes: 0 };
    let count = 0, minutes = 0;
    for (const day of weekDays) {
      const key = `${activeTechId}-${format(day, 'yyyy-MM-dd')}`;
      const slots = creneauxByTechDay.get(key) || [];
      count += slots.length;
      minutes += slots.reduce((s, c) => s + c.duree, 0);
    }
    return { count, minutes };
  }, [activeTechId, creneauxByTechDay, weekDays]);

  const weekLabel = `${format(weekStart, 'dd MMM', { locale: fr })} — ${format(addDays(weekStart, 4), 'dd MMM yyyy', { locale: fr })}`;
  const activeTech = technicians.find(t => t.id === activeTechId);

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3 shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Planning semaine (Lun–Ven)
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onWeekChange(addWeeks(weekStart, -1))}><ChevronLeft className="w-4 h-4" /></Button>
              <span className="text-xs font-medium text-muted-foreground min-w-[140px] text-center">{weekLabel}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onWeekChange(addWeeks(weekStart, 1))}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>

          {/* Tech chips */}
          {!isLoading && technicians.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {technicians.map(tech => {
                const isActive = tech.id === activeTechId;
                const initials = tech.label.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
                const compat = isCompatible ? isCompatible(tech.id) : null;
                const matched = getMatchedCompetences ? getMatchedCompetences(tech.id) : [];

                // Compatibility visual: HARD fail=red, compatible=green, neutral=default
                let chipClass = 'border-border bg-card text-foreground hover:bg-muted hover:border-primary/30';
                if (isActive) chipClass = 'border-primary bg-primary text-primary-foreground shadow-sm';
                else if (compat === false) chipClass = 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300';
                else if (compat === true) chipClass = 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300';

                return (
                  <TooltipProvider key={tech.id} delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setSelectedTechId(tech.id)}
                          onDoubleClick={() => setDrawerTech(tech)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all border ${chipClass}`}
                        >
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                            style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : (tech.color || 'hsl(var(--muted))'), color: isActive ? 'inherit' : 'white' }}>
                            {initials}
                          </div>
                          {tech.label}
                          {compat === true && !isActive && <span className="text-green-600 dark:text-green-400 text-[10px]">✓</span>}
                          {compat === false && !isActive && <span className="text-red-500 text-[10px]">✗</span>}
                          <button
                            onClick={(e) => { e.stopPropagation(); setDrawerTech(tech); }}
                            className="ml-0.5 opacity-40 hover:opacity-100 transition-opacity"
                            title="Éditer compétences"
                          >
                            <Settings2 className="w-3 h-3" />
                          </button>
                        </button>
                      </TooltipTrigger>
                      {compat !== null && (
                        <TooltipContent side="bottom" className="text-xs max-w-xs">
                          {compat
                            ? `✓ Compatible : ${matched.join(', ')}`
                            : '✗ Incompatible : compétence requise manquante (cliquer ⚙ pour éditer)'
                          }
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          )}

          {/* Stats + legend */}
          {!isLoading && activeTech && (
            <div className="flex items-center justify-between">
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className="text-[10px]">{techStats.count} créneaux</Badge>
                <Badge variant="outline" className="text-[10px]">{Math.round(techStats.minutes / 60)}h planifiées</Badge>
              </div>
              <div className="flex gap-3 flex-wrap">
                {[
                  { label: 'RT/RDV', cls: 'bg-amber-200 dark:bg-amber-800' },
                  { label: 'TVX', cls: 'bg-purple-200 dark:bg-purple-800' },
                  { label: 'Dép.', cls: 'bg-orange-200 dark:bg-orange-800' },
                  { label: 'Congé', cls: 'bg-red-200 dark:bg-red-800' },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-sm ${l.cls}`} />
                    <span className="text-[9px] text-muted-foreground">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden p-0 px-2 pb-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Chargement planning...</span>
            </div>
          ) : !activeTech ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucun technicien trouvé</p>
          ) : (
            <ScrollArea className="h-full">
              <div className="flex">
                <TimeScale />
                <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${WEEK_DAYS_COUNT}, 1fr)` }}>
                  {weekDays.map((day, i) => (
                    <div key={i} className="text-[10px] font-medium text-center text-muted-foreground pb-1 border-l border-border/20">
                      {format(day, 'EEE dd', { locale: fr })}
                    </div>
                  ))}
                  {weekDays.map((day, i) => {
                    const key = `${activeTechId}-${format(day, 'yyyy-MM-dd')}`;
                    return <DayColumn key={i} creneaux={creneauxByTechDay.get(key) || []} />;
                  })}
                </div>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Tech Drawer */}
      <TechDrawer
        open={!!drawerTech}
        onOpenChange={(open) => { if (!open) setDrawerTech(null); }}
        collaboratorId={drawerTech?.collaboratorId}
        techName={drawerTech?.label || ''}
      />
    </>
  );
}
