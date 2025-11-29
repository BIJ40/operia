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
    variant: 4 as const,
  },
  {
    title: 'Diffusion',
    description: 'Mode affichage TV agence',
    icon: Tv,
    href: ROUTES.pilotage.diffusion,
    badge: 'En cours',
    variant: 2 as const,
  },
  {
    title: 'RH Tech',
    description: 'Planning hebdomadaire techniciens',
    icon: Calendar,
    href: ROUTES.pilotage.rhTech,
    variant: 7 as const,
  },
  {
    title: 'Mon équipe',
    description: 'Gestion des collaborateurs de l\'agence',
    icon: Users,
    href: ROUTES.pilotage.equipe,
    variant: 1 as const,
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

// VERSION 1: Gradient bas-droite + icône circulaire outline
function TileVersion1({ title, description, icon: Icon, href, badge }: TileProps) {
  return (
    <Link to={href}>
      <div className="group h-full rounded-xl border border-helpconfort-blue/20 p-5
        bg-gradient-to-br from-white to-helpconfort-blue/5
        shadow-sm transition-all duration-300
        hover:to-helpconfort-blue/15 hover:shadow-lg hover:-translate-y-1">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-full border-2 border-helpconfort-blue/30 flex items-center justify-center
            group-hover:border-helpconfort-blue group-hover:bg-white/50 transition-all">
            <Icon className="w-5 h-5 text-helpconfort-blue" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground">{title}</h3>
              {badge && (
                <Badge className="text-xs bg-helpconfort-blue/10 text-helpconfort-blue border border-helpconfort-blue/30">
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

// VERSION 2: Gradient haut-bas + icône carrée bordée
function TileVersion2({ title, description, icon: Icon, href, badge }: TileProps) {
  return (
    <Link to={href}>
      <div className="group h-full rounded-xl border border-helpconfort-blue/15 p-5
        bg-gradient-to-b from-helpconfort-blue/5 to-white
        shadow-sm transition-all duration-300
        hover:from-helpconfort-blue/15 hover:shadow-lg hover:-translate-y-1">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg border-2 border-helpconfort-blue/25 flex items-center justify-center
            group-hover:border-helpconfort-blue group-hover:bg-white transition-all">
            <Icon className="w-5 h-5 text-helpconfort-blue" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground">{title}</h3>
              {badge && (
                <Badge className="text-xs bg-helpconfort-blue/10 text-helpconfort-blue border border-helpconfort-blue/30">
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

// VERSION 4: Gradient gauche-droite + bordure gauche accent
function TileVersion4({ title, description, icon: Icon, href, badge }: TileProps) {
  return (
    <Link to={href}>
      <div className="group h-full rounded-xl border border-helpconfort-blue/15 p-5
        border-l-4 border-l-helpconfort-blue/40
        bg-gradient-to-r from-helpconfort-blue/5 to-white
        shadow-sm transition-all duration-300
        hover:from-helpconfort-blue/15 hover:border-l-helpconfort-blue hover:shadow-lg hover:-translate-y-1">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-helpconfort-blue/30 flex items-center justify-center
            group-hover:border-helpconfort-blue group-hover:bg-white transition-all">
            <Icon className="w-5 h-5 text-helpconfort-blue" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground">{title}</h3>
              {badge && (
                <Badge className="text-xs bg-helpconfort-blue/10 text-helpconfort-blue border border-helpconfort-blue/30">
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

// VERSION 7: Gradient coin haut-gauche + icône en haut
function TileVersion7({ title, description, icon: Icon, href, badge }: TileProps) {
  return (
    <Link to={href}>
      <div className="group h-full rounded-xl border border-helpconfort-blue/15 p-5
        bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-helpconfort-blue/10 via-white to-white
        shadow-sm transition-all duration-300
        hover:from-helpconfort-blue/20 hover:shadow-lg hover:-translate-y-1">
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-full border-2 border-helpconfort-blue/30 flex items-center justify-center
              group-hover:border-helpconfort-blue group-hover:bg-white transition-all">
              <Icon className="w-5 h-5 text-helpconfort-blue" />
            </div>
            {badge && (
              <Badge className="text-xs bg-helpconfort-blue/10 text-helpconfort-blue border border-helpconfort-blue/30">
                {badge}
              </Badge>
            )}
          </div>
          <h3 className="font-semibold text-foreground mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </Link>
  );
}

// Composant de sélection basé sur la variante
const TILE_COMPONENTS: Record<number, React.FC<TileProps>> = {
  1: TileVersion1,
  2: TileVersion2,
  4: TileVersion4,
  7: TileVersion7,
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
    <div className="container mx-auto py-8 px-4">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {pilotageModules.map((module) => {
          const TileComponent = TILE_COMPONENTS[module.variant];
          return (
            <TileComponent
              key={module.href}
              title={getModuleTitle(module)}
              description={module.description}
              icon={module.icon}
              href={module.href}
              badge={module.badge}
            />
          );
        })}
      </div>
    </div>
  );
}
