import { Link } from 'react-router-dom';
import { BarChart3, ListTodo, Tv, Calendar, Users, LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ROUTES } from '@/config/routes';
import { useMenuLabels } from '@/hooks/use-page-metadata';
import { cn } from '@/lib/utils';

// Page keys correspondant aux routes
const ROUTE_TO_PAGE_KEY: Record<string, string> = {
  [ROUTES.pilotage.statsHub]: 'pilotage_statistiques',
  [ROUTES.pilotage.indicateurs]: 'pilotage_indicateurs',
  [ROUTES.pilotage.actions]: 'pilotage_actions',
  [ROUTES.pilotage.diffusion]: 'pilotage_diffusion',
  [ROUTES.pilotage.rhTech]: 'pilotage_rh_tech',
  [ROUTES.pilotage.equipe]: 'pilotage_equipe',
};

const pilotageModules = [
  {
    title: 'Statistiques',
    description: 'Tableau de bord et KPI de votre agence',
    icon: BarChart3,
    href: ROUTES.pilotage.statsHub,
    variant: 1 as const,
  },
  {
    title: 'Actions à Mener',
    description: 'Suivi des actions et tâches en cours',
    icon: ListTodo,
    href: ROUTES.pilotage.actions,
    variant: 2 as const,
  },
  {
    title: 'Diffusion',
    description: 'Mode affichage TV agence',
    icon: Tv,
    href: ROUTES.pilotage.diffusion,
    badge: 'En cours',
    variant: 3 as const,
  },
  {
    title: 'RH Tech',
    description: 'Planning hebdomadaire techniciens',
    icon: Calendar,
    href: ROUTES.pilotage.rhTech,
    variant: 4 as const,
  },
  {
    title: 'Mon équipe',
    description: 'Gestion des collaborateurs de l\'agence',
    icon: Users,
    href: ROUTES.pilotage.equipe,
    variant: 5 as const,
  },
];

// ============================================
// 5 VERSIONS DE TUILES - Choisir une seule
// ============================================

interface TileProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  badge?: string;
}

// VERSION 1: Bordure gauche accent + fond blanc
function TileVersion1({ title, description, icon: Icon, href, badge }: TileProps) {
  return (
    <Link to={href}>
      <div className="group h-full bg-white border border-border rounded-xl p-6 
        border-l-4 border-l-helpconfort-blue
        transition-all duration-200
        hover:shadow-md hover:border-helpconfort-blue/50">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-helpconfort-blue/10 flex items-center justify-center shrink-0
            group-hover:bg-helpconfort-blue/20 transition-colors">
            <Icon className="w-6 h-6 text-helpconfort-blue" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground">{title}</h3>
              {badge && (
                <Badge className="text-xs bg-helpconfort-orange text-white border-0">
                  {badge}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

// VERSION 2: Bordure complète au survol + icône en haut
function TileVersion2({ title, description, icon: Icon, href, badge }: TileProps) {
  return (
    <Link to={href}>
      <div className="group h-full bg-white border-2 border-border rounded-xl p-6
        transition-all duration-200
        hover:border-helpconfort-orange hover:shadow-md">
        <div className="w-10 h-10 rounded-full bg-helpconfort-orange/10 flex items-center justify-center mb-4
          group-hover:bg-helpconfort-orange/20 transition-colors">
          <Icon className="w-5 h-5 text-helpconfort-orange" />
        </div>
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-semibold text-foreground">{title}</h3>
          {badge && (
            <Badge className="text-xs bg-helpconfort-orange text-white border-0">
              {badge}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
        <span className="inline-block mt-4 text-sm font-medium text-helpconfort-orange opacity-0 group-hover:opacity-100 transition-opacity">
          Accéder →
        </span>
      </div>
    </Link>
  );
}

// VERSION 3: Style minimal avec ligne sous le titre
function TileVersion3({ title, description, icon: Icon, href, badge }: TileProps) {
  return (
    <Link to={href}>
      <div className="group h-full bg-white border border-border rounded-lg p-5
        transition-all duration-200
        hover:shadow-sm hover:bg-helpconfort-blue/[0.02]">
        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-helpconfort-blue/20">
          <Icon className="w-5 h-5 text-helpconfort-blue" />
          <h3 className="font-semibold text-foreground">{title}</h3>
          {badge && (
            <Badge className="text-xs bg-helpconfort-orange text-white border-0 ml-auto">
              {badge}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}

// VERSION 4: Gradient subtil au survol + bordure double
function TileVersion4({ title, description, icon: Icon, href, badge }: TileProps) {
  return (
    <Link to={href}>
      <div className="group h-full bg-white rounded-xl p-6 
        border border-helpconfort-blue/30
        shadow-sm
        transition-all duration-300
        hover:shadow-lg hover:bg-gradient-to-br hover:from-white hover:to-helpconfort-blue/5
        hover:-translate-y-1">
        <div className="flex justify-between items-start mb-4">
          <div className="w-11 h-11 rounded-lg border-2 border-helpconfort-blue/20 bg-white flex items-center justify-center
            group-hover:border-helpconfort-blue/40 group-hover:bg-helpconfort-blue/5 transition-all">
            <Icon className="w-5 h-5 text-helpconfort-blue" />
          </div>
          {badge && (
            <Badge className="text-xs bg-helpconfort-orange text-white border-0">
              {badge}
            </Badge>
          )}
        </div>
        <h3 className="font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}

// VERSION 5: Style compact avec accent bas
function TileVersion5({ title, description, icon: Icon, href, badge }: TileProps) {
  return (
    <Link to={href}>
      <div className="group h-full bg-white border border-border rounded-lg overflow-hidden
        transition-all duration-200
        hover:shadow-md">
        <div className="p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded bg-helpconfort-blue/10 flex items-center justify-center">
              <Icon className="w-4 h-4 text-helpconfort-blue" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground text-sm">{title}</h3>
                {badge && (
                  <Badge className="text-[10px] bg-helpconfort-orange text-white border-0 px-1.5 py-0">
                    {badge}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground pl-12">{description}</p>
        </div>
        <div className="h-1 bg-helpconfort-orange/20 group-hover:bg-helpconfort-orange transition-colors" />
      </div>
    </Link>
  );
}

// Composant de sélection basé sur la variante
const TILE_COMPONENTS = {
  1: TileVersion1,
  2: TileVersion2,
  3: TileVersion3,
  4: TileVersion4,
  5: TileVersion5,
};

export default function PilotageIndex() {
  const menuLabels = useMenuLabels();

  const getModuleTitle = (module: typeof pilotageModules[0]): string => {
    const pageKey = ROUTE_TO_PAGE_KEY[module.href];
    if (pageKey && menuLabels.has(pageKey)) {
      return menuLabels.get(pageKey)!;
    }
    return module.title;
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-12">
      
      {/* Affichage des 5 versions pour comparaison */}
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-muted-foreground mb-2">5 versions à comparer</h2>
          <p className="text-sm text-muted-foreground">Chaque tuile utilise une version différente</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {pilotageModules.map((module) => {
            const TileComponent = TILE_COMPONENTS[module.variant];
            return (
              <div key={module.href} className="relative">
                <div className="absolute -top-3 left-4 z-10">
                  <Badge variant="outline" className="bg-white text-xs font-mono">
                    Version {module.variant}
                  </Badge>
                </div>
                <TileComponent
                  title={getModuleTitle(module)}
                  description={module.description}
                  icon={module.icon}
                  href={module.href}
                  badge={module.badge}
                />
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
