/**
 * TeamHeatmap - Heatmap équipe techniciens
 * Vue synthétique non punitive avec zones colorées
 */

import { useMemo } from 'react';
import { TechnicianPerformance } from '@/hooks/usePerformanceTerrain';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Users } from 'lucide-react';

interface Props {
  technicians: TechnicianPerformance[];
  onSelectTechnician?: (tech: TechnicianPerformance) => void;
  onOpenSavDrawer?: (tech: TechnicianPerformance) => void;
}

// Couleurs par zone (non punitif)
function getZoneBgColor(productivity: number, load: number, sav: number): string {
  // Score composite
  const productivityScore = productivity >= 0.65 ? 2 : productivity >= 0.5 ? 1 : 0;
  const loadScore = load >= 0.8 && load <= 1.1 ? 2 : load >= 0.6 && load <= 1.3 ? 1 : 0;
  const savScore = sav <= 0.03 ? 2 : sav <= 0.08 ? 1 : 0;
  
  const total = productivityScore + loadScore + savScore;
  
  if (total >= 5) return 'bg-green-500/20 hover:bg-green-500/30 border-green-500/50';
  if (total >= 3) return 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/50';
  return 'bg-red-500/20 hover:bg-red-500/30 border-red-500/50';
}

function getZoneLabel(productivity: number, load: number): string {
  if (productivity >= 0.65 && load >= 0.8 && load <= 1.1) return 'Zone de confort';
  if (productivity >= 0.5) return 'Zone d\'optimisation';
  return 'Zone de tension';
}

export function TeamHeatmap({ technicians, onSelectTechnician, onOpenSavDrawer }: Props) {
  const sortedTechs = useMemo(() => {
    return [...technicians].sort((a, b) => b.productivityRate - a.productivityRate);
  }, [technicians]);

  const handleSavClick = (e: React.MouseEvent, tech: TechnicianPerformance) => {
    e.stopPropagation();
    onOpenSavDrawer?.(tech);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="w-5 h-5 text-primary" />
          Vue équipe
          <span className="text-muted-foreground font-normal ml-auto text-sm">
            {technicians.length} techniciens
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {sortedTechs.map((tech) => (
                <Tooltip key={tech.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onSelectTechnician?.(tech)}
                    className={`
                      relative p-3 rounded-lg border transition-all cursor-pointer
                      ${tech.isAbsent 
                        ? 'bg-muted/50 hover:bg-muted/70 border-muted-foreground/30 opacity-70' 
                        : getZoneBgColor(tech.productivityRate, tech.loadRatio, tech.savRate)
                      }
                    `}
                  >
                    {/* Badge absence */}
                    {tech.isAbsent && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-muted-foreground/80 text-white text-[8px] font-medium whitespace-nowrap z-10">
                        Absent
                      </div>
                    )}

                    {/* Jauge absence partielle */}
                    {!tech.isAbsent && (tech.absenceRatio ?? 0) > 0 && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/90 text-white text-[8px] font-medium whitespace-nowrap z-10">
                        <div className="w-8 h-1.5 bg-white/30 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-white rounded-full"
                            style={{ width: `${Math.round((tech.absenceRatio ?? 0) * 100)}%` }}
                          />
                        </div>
                        {Math.round((tech.absenceRatio ?? 0) * 100)}%
                      </div>
                    )}
                    
                    {/* Avatar avec initiales */}
                    <div 
                      className={`w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center text-white text-sm font-bold ${tech.isAbsent ? 'grayscale' : ''}`}
                      style={{ backgroundColor: tech.color || 'hsl(var(--primary))' }}
                    >
                      {tech.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    
                    {/* Nom */}
                    <div className="text-xs font-medium text-center truncate">
                      {tech.name.split(' ')[0]}
                    </div>
                    
                    {/* Indicateur productivité */}
                    <div className="text-[10px] text-muted-foreground text-center mt-1">
                      {tech.isAbsent ? '—' : `${Math.round(tech.productivityRate * 100)}%`}
                    </div>
                    
                    {/* Indicateur SAV cliquable si > 0 */}
                    {tech.savCount > 0 && (
                      <button
                        onClick={(e) => handleSavClick(e, tech)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-[10px] flex items-center justify-center transition-colors"
                        title="Voir les SAV"
                      >
                        {tech.savCount}
                      </button>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <div className="space-y-1">
                    <div className="font-medium">{tech.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {getZoneLabel(tech.productivityRate, tech.loadRatio)}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-2">
                      <div>Productivité:</div>
                      <div className="font-medium">{Math.round(tech.productivityRate * 100)}%</div>
                      <div>Charge:</div>
                      <div className="font-medium">{Math.round(tech.loadRatio * 100)}%</div>
                      <div>SAV:</div>
                      <div className="font-medium">{tech.savCount}</div>
                      <div>Interventions:</div>
                      <div className="font-medium">{tech.interventionsCount}</div>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>

        {/* Légende */}
        <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-500/40" />
            <span className="text-muted-foreground">Zone de confort</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-amber-500/40" />
            <span className="text-muted-foreground">Zone d'optimisation</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-500/40" />
            <span className="text-muted-foreground">Zone de tension</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
