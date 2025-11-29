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

// VERSION 3: Gradient radial centre + icône ronde pleine au hover
function TileVersion3({ title, description, icon: Icon, href, badge }: TileProps) {
  return (
    <Link to={href}>
      <div className="group h-full rounded-xl border border-helpconfort-blue/20 p-5
        bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-helpconfort-blue/8 via-white to-white
        shadow-sm transition-all duration-300
        hover:from-helpconfort-blue/20 hover:shadow-lg hover:-translate-y-1">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-helpconfort-blue/10 flex items-center justify-center
            group-hover:bg-helpconfort-blue transition-all">
            <Icon className="w-5 h-5 text-helpconfort-blue group-hover:text-white transition-colors" />
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

// VERSION 5: Gradient diagonal inverse + double bordure
function TileVersion5({ title, description, icon: Icon, href, badge }: TileProps) {
  return (
    <Link to={href}>
      <div className="group h-full rounded-xl p-5
        border-2 border-helpconfort-blue/20
        bg-gradient-to-tl from-helpconfort-blue/8 to-white
        shadow-sm transition-all duration-300
        hover:from-helpconfort-blue/18 hover:border-helpconfort-blue/40 hover:shadow-xl hover:-translate-y-1">
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

// VERSION 6: Gradient bas + barre bleue bas
function TileVersion6({ title, description, icon: Icon, href, badge }: TileProps) {
  return (
    <Link to={href}>
      <div className="group h-full rounded-xl border border-helpconfort-blue/15 overflow-hidden
        bg-gradient-to-b from-white to-helpconfort-blue/5
        shadow-sm transition-all duration-300
        hover:to-helpconfort-blue/12 hover:shadow-lg hover:-translate-y-1">
        <div className="p-5">
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
        <div className="h-1 bg-helpconfort-blue/20 group-hover:bg-helpconfort-blue transition-colors" />
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

// VERSION 8: Gradient subtil uniforme + icône carrée fond bleu
function TileVersion8({ title, description, icon: Icon, href, badge }: TileProps) {
  return (
    <Link to={href}>
      <div className="group h-full rounded-xl border border-helpconfort-blue/20 p-5
        bg-gradient-to-br from-white via-white to-helpconfort-blue/8
        shadow-sm transition-all duration-300
        hover:to-helpconfort-blue/18 hover:shadow-lg hover:-translate-y-1">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-helpconfort-blue/10 flex items-center justify-center
            group-hover:bg-helpconfort-blue transition-all">
            <Icon className="w-5 h-5 text-helpconfort-blue group-hover:text-white transition-colors" />
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

// VERSION 9: Gradient doux haut + ombre colorée bleue
function TileVersion9({ title, description, icon: Icon, href, badge }: TileProps) {
  return (
    <Link to={href}>
      <div className="group h-full rounded-xl border border-helpconfort-blue/15 p-5
        bg-gradient-to-b from-helpconfort-blue/8 via-white to-white
        shadow-[0_4px_20px_-4px_rgba(0,122,204,0.1)]
        transition-all duration-300
        hover:from-helpconfort-blue/18 hover:shadow-[0_8px_30px_-4px_rgba(0,122,204,0.2)] hover:-translate-y-1">
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

// VERSION 10: Gradient coins opposés + bordure progressive
function TileVersion10({ title, description, icon: Icon, href, badge }: TileProps) {
  return (
    <Link to={href}>
      <div className="group h-full rounded-xl p-5
        border border-helpconfort-blue/20
        bg-[conic-gradient(from_225deg_at_0%_0%,_var(--tw-gradient-stops))] from-helpconfort-blue/8 via-white to-white
        shadow-sm transition-all duration-300
        hover:from-helpconfort-blue/18 hover:border-helpconfort-blue/40 hover:shadow-lg hover:-translate-y-1">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-full border-2 border-helpconfort-blue/25 flex items-center justify-center
            group-hover:border-helpconfort-blue group-hover:bg-white/80 transition-all">
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

// Composant de sélection basé sur la variante
const TILE_COMPONENTS: Record<number, React.FC<TileProps>> = {
  1: TileVersion1,
  2: TileVersion2,
  3: TileVersion3,
  4: TileVersion4,
  5: TileVersion5,
  6: TileVersion6,
  7: TileVersion7,
  8: TileVersion8,
  9: TileVersion9,
  10: TileVersion10,
};

// Tuiles vides pour afficher les versions 6-10
const emptyTiles = [
  { variant: 6, title: 'Version 6', description: 'Bordure pointillée + gradient icône', icon: BarChart3 },
  { variant: 7, title: 'Version 7', description: 'Ombre colorée bleue + icône pleine', icon: ListTodo },
  { variant: 8, title: 'Version 8', description: 'Icône outline circulaire', icon: Tv },
  { variant: 9, title: 'Version 9', description: 'Bicolore avec séparateur', icon: Calendar },
  { variant: 10, title: 'Version 10', description: 'Accent en coin orange', icon: Users },
];

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
          <h2 className="text-lg font-semibold text-muted-foreground mb-2">Versions 1-5</h2>
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

      {/* Versions 6-10 */}
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-muted-foreground mb-2">Versions 6-10</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {emptyTiles.map((tile) => {
            const TileComponent = TILE_COMPONENTS[tile.variant];
            return (
              <div key={tile.variant} className="relative">
                <div className="absolute -top-3 left-4 z-10">
                  <Badge variant="outline" className="bg-white text-xs font-mono">
                    Version {tile.variant}
                  </Badge>
                </div>
                <TileComponent
                  title={tile.title}
                  description={tile.description}
                  icon={tile.icon}
                  href="#"
                />
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
