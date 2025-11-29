import { CardContent } from "@/components/ui/card";
import { UniversStats } from "@/apogee-connect/utils/universCalculations";
import { formatEuros } from "@/apogee-connect/utils/formatters";
import { Package, Euro, Wrench, Calendar } from "lucide-react";
import * as LucideIcons from "lucide-react";

interface UniversKpiCardProps {
  stat: UniversStats;
  color: string;
  label: string;
  icon: string;
}

export const UniversKpiCard = ({ stat, color, label, icon }: UniversKpiCardProps) => {
  // Dynamically get the icon component
  const IconComponent = (LucideIcons as any)[icon] || LucideIcons.HelpCircle;

  return (
    <div 
      className="group rounded-xl border p-4 h-full cursor-pointer
        shadow-sm transition-all duration-300
        hover:shadow-lg hover:-translate-y-1"
      style={{ 
        borderColor: `${color}30`,
        borderLeftWidth: '4px',
        borderLeftColor: color,
        background: `linear-gradient(to bottom right, white, ${color}08)`,
      }}
    >
      <div 
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: `linear-gradient(to bottom right, white, ${color}15)` }}
      />
      <div className="relative space-y-3">
        {/* En-tête avec icône et titre */}
        <div className="flex items-center gap-3">
          <div 
            className="p-2 rounded-lg border-2 transition-all group-hover:scale-105"
            style={{ 
              backgroundColor: `${color}15`,
              borderColor: `${color}30`,
            }}
          >
            <IconComponent className="w-5 h-5" style={{ color }} />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold">{label}</h4>
            <p className="text-xs text-muted-foreground">Univers métier</p>
          </div>
        </div>

        {/* CA HT principal */}
        <div className="text-left pt-2 border-t" style={{ borderColor: `${color}20` }}>
          <p className="text-2xl font-bold" style={{ color }}>
            {formatEuros(stat.caHT)}
          </p>
          <p className="text-xs text-muted-foreground">CA HT</p>
        </div>

        {/* Métriques détaillées en grille 2x2 */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t" style={{ borderColor: `${color}20` }}>
          {/* Dossiers */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <div className="bg-blue-500/10 p-1 rounded">
                <Package className="w-3 h-3 text-blue-500" />
              </div>
              <p className="text-sm font-semibold">{stat.nbDossiers}</p>
            </div>
            <p className="text-xs text-muted-foreground">Dossiers</p>
          </div>

          {/* Panier moyen */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <div className="bg-green-500/10 p-1 rounded">
                <Euro className="w-3 h-3 text-green-500" />
              </div>
              <p className="text-sm font-semibold">{formatEuros(stat.panierMoyen)}</p>
            </div>
            <p className="text-xs text-muted-foreground">Panier moyen</p>
          </div>

          {/* Interventions */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <div className="bg-purple-500/10 p-1 rounded">
                <Calendar className="w-3 h-3 text-purple-500" />
              </div>
              <p className="text-sm font-semibold">{stat.nbInterventions}</p>
            </div>
            <p className="text-xs text-muted-foreground">Interventions</p>
          </div>

          {/* Taux SAV */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <div className="bg-orange-500/10 p-1 rounded">
                <Wrench className="w-3 h-3 text-orange-500" />
              </div>
              <p className="text-sm font-semibold">
                {stat.tauxSAV !== null ? `${stat.tauxSAV.toFixed(1)}%` : "--"}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">Taux SAV</p>
          </div>
        </div>
      </div>
    </div>
  );
};
