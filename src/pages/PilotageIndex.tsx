import { BarChart3, ListTodo, Tv, Building2, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ROUTES } from '@/config/routes';
import { AgencyInfoTile } from '@/components/pilotage/AgencyInfoTile';
import { useAuth } from '@/contexts/AuthContext';
import { memo, useState, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PilotageModule {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  badge?: string | number;
}

const pilotageModules: PilotageModule[] = [
  {
    id: 'stats_hub',
    title: 'Stats Hub',
    description: 'Centre statistiques unifié de l\'agence',
    icon: BarChart3,
    href: ROUTES.agency.statsHub,
  },
  {
    id: 'actions',
    title: 'Actions à mener',
    description: 'Suivi des actions et tâches en cours',
    icon: ListTodo,
    href: ROUTES.agency.actions,
  },
  {
    id: 'diffusion',
    title: 'Diffusion',
    description: 'Mode TV agence avec statistiques',
    icon: Tv,
    href: ROUTES.agency.diffusion,
  },
];

// Custom hook for agency info collapse state
const AGENCY_INFO_STORAGE_KEY = 'pilotage-agency-info-open';

export default function PilotageIndex() {
  const { globalRole } = useAuth();
  
  const [isAgencyInfoOpen, setIsAgencyInfoOpen] = useState(() => {
    try {
      const stored = localStorage.getItem(AGENCY_INFO_STORAGE_KEY);
      return stored ? JSON.parse(stored) : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    localStorage.setItem(AGENCY_INFO_STORAGE_KEY, JSON.stringify(isAgencyInfoOpen));
  }, [isAgencyInfoOpen]);

  const isPlatformAdmin = globalRole === 'superadmin' || globalRole === 'platform_admin';

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* Tuiles principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {pilotageModules.map(module => (
          <PilotageTileCard
            key={module.id}
            module={module}
            badge={module.badge}
            isAdmin={isPlatformAdmin}
          />
        ))}
      </div>

      {/* Informations de l'agence - section collapsible */}
      <section className="group/section">
        <div
          onClick={() => setIsAgencyInfoOpen(!isAgencyInfoOpen)}
          className={cn(
            "w-full flex items-center justify-between cursor-pointer",
            "min-h-[72px] py-4 px-5 -mx-1 rounded-2xl",
            "border border-transparent",
            "bg-gradient-to-r from-muted/50 via-background to-muted/30",
            "hover:border-border hover:from-muted/80 hover:via-background hover:to-muted/50",
            "hover:shadow-md",
            "transition-all duration-300"
          )}
        >
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-14 h-14 rounded-xl flex items-center justify-center",
              "bg-gradient-to-br from-helpconfort-blue/15 to-helpconfort-blue/5",
              "border border-helpconfort-blue/20",
              "transition-all duration-300"
            )}>
              <Building2 className="w-7 h-7 text-helpconfort-blue" />
            </div>
            <h2 className="text-xl font-bold text-foreground tracking-tight">
              Informations de l'agence
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className={cn(
              "hidden sm:block w-16 h-1 rounded-full",
              "bg-gradient-to-r from-helpconfort-blue/40 to-helpconfort-blue/10",
              "group-hover/section:from-helpconfort-blue/60 group-hover/section:to-helpconfort-blue/20",
              "transition-all duration-300"
            )} />
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              "bg-muted/80 border border-border/50",
              "transition-all duration-300"
            )}>
              <ChevronDown 
                className={cn(
                  "w-5 h-5 text-muted-foreground",
                  "transition-all duration-300",
                  isAgencyInfoOpen && "rotate-180"
                )} 
              />
            </div>
          </div>
        </div>
        
        <div
          className={cn(
            "grid transition-all duration-300 ease-out",
            isAgencyInfoOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          )}
        >
          <div className="overflow-hidden">
            <div className={cn(
              "pt-5 pb-2",
              "transition-transform duration-300 ease-out",
              isAgencyInfoOpen ? "translate-y-0" : "-translate-y-2"
            )}>
              <AgencyInfoTile hideHeader />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

interface PilotageTileCardProps {
  module: PilotageModule;
  badge?: string | number;
  isAdmin?: boolean;
  isClickable?: boolean;
}

const PilotageTileCard = memo(function PilotageTileCard({ 
  module, 
  badge, 
  isAdmin,
  isClickable = true 
}: PilotageTileCardProps) {
  const Icon = module.icon;
  const isDisabled = module.badge === 'Bientôt' && !isAdmin;

  const content = (
    <div className={`
      group relative rounded-xl border border-helpconfort-blue/15 p-4
      bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-helpconfort-blue/10 via-background to-background
      shadow-sm transition-all duration-300 border-l-4 border-l-helpconfort-blue
      ${isDisabled 
        ? 'opacity-50 cursor-not-allowed' 
        : 'cursor-pointer hover:from-helpconfort-blue/20 hover:shadow-lg hover:-translate-y-0.5'
      }
    `}>
      {badge && (
        <span className={`absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full z-10 ${
          typeof badge === 'number' 
            ? 'bg-red-500 text-white animate-pulse min-w-[20px] text-center' 
            : 'bg-helpconfort-blue text-white text-[10px]'
        }`}>
          {badge}
        </span>
      )}
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full border-2 border-helpconfort-blue/30 flex-shrink-0 flex items-center justify-center bg-helpconfort-blue/10
          ${!isDisabled && 'group-hover:border-helpconfort-blue'} transition-all`}>
          <Icon className="w-5 h-5 text-helpconfort-blue" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-foreground truncate">{module.title}</p>
          <p className="text-xs text-muted-foreground truncate">{module.description}</p>
        </div>
        <ArrowRight className={`w-4 h-4 flex-shrink-0 text-muted-foreground ${!isDisabled && 'group-hover:text-helpconfort-blue group-hover:translate-x-0.5'} transition-all`} aria-hidden="true" />
      </div>
    </div>
  );

  if (isDisabled || !isClickable) {
    return content;
  }

  return <Link to={module.href}>{content}</Link>;
});
