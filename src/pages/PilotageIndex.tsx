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

// VERSION 1: Icône circulaire outline + barre orange bas + élévation
function TileVersion1({ title, description, icon: Icon, href, badge }: TileProps) {
  return (
    <Link to={href}>
      <div className="group h-full bg-white rounded-xl border border-border overflow-hidden
        shadow-sm transition-all duration-300
        hover:shadow-lg hover:-translate-y-1">
        <div className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-full border-2 border-helpconfort-blue/30 flex items-center justify-center
              group-hover:border-helpconfort-blue group-hover:bg-helpconfort-blue/5 transition-all">
              <Icon className="w-5 h-5 text-helpconfort-blue" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground">{title}</h3>
                {badge && (
                  <Badge className="text-xs bg-helpconfort-orange/10 text-helpconfort-orange border border-helpconfort-orange/30">
                    {badge}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
        </div>
        <div className="h-1 bg-helpconfort-orange/20 group-hover:bg-helpconfort-orange transition-colors" />
      </div>
    </Link>
  );
}

// VERSION 2: Icône carrée bordée + gradient hover + barre accent
function TileVersion2({ title, description, icon: Icon, href, badge }: TileProps) {
  return (
    <Link to={href}>
      <div className="group h-full bg-white rounded-xl border border-helpconfort-blue/20 overflow-hidden
        shadow-sm transition-all duration-300
        hover:shadow-lg hover:bg-gradient-to-br hover:from-white hover:to-helpconfort-blue/5 hover:-translate-y-1">
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-lg border-2 border-helpconfort-blue/20 bg-white flex items-center justify-center
              group-hover:border-helpconfort-blue/40 group-hover:bg-helpconfort-blue/5 transition-all">
              <Icon className="w-5 h-5 text-helpconfort-blue" />
            </div>
            <div className="flex-1 pt-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground">{title}</h3>
                {badge && (
                  <Badge className="text-xs bg-helpconfort-orange/10 text-helpconfort-orange border border-helpconfort-orange/30">
                    {badge}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
        </div>
        <div className="h-1 bg-helpconfort-blue/10 group-hover:bg-helpconfort-blue transition-colors" />
      </div>
    </Link>
  );
}

// VERSION 3: Compact + icône circulaire + élévation douce
function TileVersion3({ title, description, icon: Icon, href, badge }: TileProps) {
  return (
    <Link to={href}>
      <div className="group h-full bg-white rounded-lg border border-border p-4
        shadow-sm transition-all duration-300
        hover:shadow-md hover:border-helpconfort-blue/40 hover:-translate-y-0.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-helpconfort-blue/20 flex items-center justify-center
            group-hover:border-helpconfort-blue group-hover:bg-helpconfort-blue/5 transition-all">
            <Icon className="w-4 h-4 text-helpconfort-blue" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground text-sm">{title}</h3>
              {badge && (
                <Badge className="text-[10px] bg-helpconfort-orange/10 text-helpconfort-orange border border-helpconfort-orange/30 px-1.5 py-0">
                  {badge}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">{description}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

// VERSION 4: Icône ronde pleine + barre bas + gradient
function TileVersion4({ title, description, icon: Icon, href, badge }: TileProps) {
  return (
    <Link to={href}>
      <div className="group h-full bg-white rounded-xl border border-border overflow-hidden
        transition-all duration-300
        hover:shadow-lg hover:bg-gradient-to-br hover:from-white hover:to-helpconfort-orange/5 hover:-translate-y-1">
        <div className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-helpconfort-blue/10 flex items-center justify-center
              group-hover:bg-helpconfort-blue group-hover:text-white transition-all">
              <Icon className="w-5 h-5 text-helpconfort-blue group-hover:text-white transition-colors" />
            </div>
            <div className="flex-1">
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
        <div className="h-1 bg-helpconfort-orange/20 group-hover:bg-helpconfort-orange transition-colors" />
      </div>
    </Link>
  );
}

// VERSION 5: Double bordure + icône carrée + élévation forte
function TileVersion5({ title, description, icon: Icon, href, badge }: TileProps) {
  return (
    <Link to={href}>
      <div className="group h-full bg-white rounded-xl p-5
        border-2 border-helpconfort-blue/15
        shadow-sm transition-all duration-300
        hover:border-helpconfort-blue/40 hover:shadow-xl hover:-translate-y-1">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg border-2 border-helpconfort-blue/20 flex items-center justify-center
            group-hover:border-helpconfort-blue group-hover:bg-helpconfort-blue/5 transition-all">
            <Icon className="w-6 h-6 text-helpconfort-blue" />
          </div>
          <div className="flex-1 pt-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground">{title}</h3>
              {badge && (
                <Badge className="text-xs bg-helpconfort-orange/10 text-helpconfort-orange border border-helpconfort-orange/30">
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

// VERSION 6: Ultra compact + barre colorée + icône outline
function TileVersion6({ title, description, icon: Icon, href, badge }: TileProps) {
  return (
    <Link to={href}>
      <div className="group h-full bg-white rounded-lg border border-border overflow-hidden
        transition-all duration-200
        hover:shadow-md hover:border-helpconfort-blue/30">
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full border-2 border-helpconfort-blue/25 flex items-center justify-center
              group-hover:border-helpconfort-blue transition-colors">
              <Icon className="w-4 h-4 text-helpconfort-blue" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-foreground text-sm">{title}</h3>
                {badge && (
                  <Badge className="text-[10px] bg-helpconfort-orange text-white border-0 px-1.5 py-0">
                    {badge}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{description}</p>
            </div>
          </div>
        </div>
        <div className="h-0.5 bg-helpconfort-blue/10 group-hover:bg-helpconfort-blue transition-colors" />
      </div>
    </Link>
  );
}

// VERSION 7: Icône en haut + gradient subtil + élévation
function TileVersion7({ title, description, icon: Icon, href, badge }: TileProps) {
  return (
    <Link to={href}>
      <div className="group h-full bg-white rounded-xl border border-border p-5
        shadow-sm transition-all duration-300
        hover:shadow-lg hover:bg-gradient-to-b hover:from-white hover:to-helpconfort-blue/5 hover:-translate-y-1">
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-full border-2 border-helpconfort-blue/30 flex items-center justify-center
              group-hover:border-helpconfort-blue group-hover:bg-helpconfort-blue/10 transition-all">
              <Icon className="w-5 h-5 text-helpconfort-blue" />
            </div>
            {badge && (
              <Badge className="text-xs bg-helpconfort-orange/10 text-helpconfort-orange border border-helpconfort-orange/30">
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

// VERSION 8: Bordure bleue gauche + icône outline + élévation
function TileVersion8({ title, description, icon: Icon, href, badge }: TileProps) {
  return (
    <Link to={href}>
      <div className="group h-full bg-white rounded-xl border border-border p-5
        border-l-4 border-l-helpconfort-blue/50
        shadow-sm transition-all duration-300
        hover:shadow-lg hover:border-l-helpconfort-blue hover:-translate-y-1">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-helpconfort-blue/25 flex items-center justify-center
            group-hover:border-helpconfort-blue group-hover:bg-helpconfort-blue/5 transition-all">
            <Icon className="w-5 h-5 text-helpconfort-blue" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground">{title}</h3>
              {badge && (
                <Badge className="text-xs bg-helpconfort-orange/10 text-helpconfort-orange border border-helpconfort-orange/30">
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

// VERSION 9: Icône carrée fond bleu + barre bas orange + hover gradient
function TileVersion9({ title, description, icon: Icon, href, badge }: TileProps) {
  return (
    <Link to={href}>
      <div className="group h-full bg-white rounded-xl border border-helpconfort-blue/15 overflow-hidden
        shadow-sm transition-all duration-300
        hover:shadow-xl hover:bg-gradient-to-br hover:from-white hover:to-helpconfort-blue/5 hover:-translate-y-1">
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-lg bg-helpconfort-blue/10 flex items-center justify-center
              group-hover:bg-helpconfort-blue transition-all">
              <Icon className="w-5 h-5 text-helpconfort-blue group-hover:text-white transition-colors" />
            </div>
            <div className="flex-1 pt-1">
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
        <div className="h-1 bg-helpconfort-orange/15 group-hover:bg-helpconfort-orange transition-colors" />
      </div>
    </Link>
  );
}

// VERSION 10: Minimaliste + bordure double hover + icône circle
function TileVersion10({ title, description, icon: Icon, href, badge }: TileProps) {
  return (
    <Link to={href}>
      <div className="group h-full bg-white rounded-xl p-5
        border border-border
        transition-all duration-300
        hover:border-2 hover:border-helpconfort-blue/40 hover:shadow-lg hover:-translate-y-1">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-full border-2 border-helpconfort-blue/20 flex items-center justify-center
            group-hover:border-helpconfort-blue group-hover:bg-helpconfort-blue/10 transition-all">
            <Icon className="w-5 h-5 text-helpconfort-blue" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground">{title}</h3>
              {badge && (
                <Badge className="text-xs bg-helpconfort-orange/10 text-helpconfort-orange border border-helpconfort-orange/30">
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
