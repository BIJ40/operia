import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight, LucideIcon } from 'lucide-react';
import { DASHBOARD_TILES, DASHBOARD_GROUPS, DashboardTile } from '@/config/dashboardTiles';
import { useMemo } from 'react';
import { getRoleCapabilities, canAccessTileGroup, canAccessTile, TileGroup } from '@/config/roleMatrix';
import { isModuleEnabled } from '@/types/modules';
import { useSupportNotifications } from '@/hooks/use-support-notifications';

export default function Landing() {
  const { agence, globalRole, canAccessSupportConsole, enabledModules } = useAuth();
  
  // Utiliser le même hook que le header pour synchroniser les compteurs
  const { newTicketsCount } = useSupportNotifications();

  // V2: Capacités basées sur ROLE_MATRIX
  const caps = getRoleCapabilities(globalRole);

  // V2: Filtrer les tuiles basé sur ROLE_MATRIX + canAccessSupportConsole de AuthContext
  const visibleTiles = useMemo(() => {
    return DASHBOARD_TILES.filter(tile => {
      // 1. Vérifier l'accès au groupe
      const groupAccess = canAccessTileGroup(globalRole, tile.group as TileGroup, { agence });
      if (!groupAccess) return false;
      
      // 2. Vérifier si la tuile nécessite un module spécifique (admins bypass)
      if (tile.requiresModule) {
        const isAdmin = globalRole === 'superadmin' || globalRole === 'platform_admin';
        if (!isAdmin && !isModuleEnabled(enabledModules, tile.requiresModule)) {
          return false;
        }
      }
      
      // 3. Vérifier l'accès à la tuile spécifique (passer canAccessSupportConsole pour CONSOLE_SUPPORT)
      return canAccessTile(globalRole, tile.id, { agence, canAccessSupportConsole });
    });
  }, [globalRole, agence, canAccessSupportConsole, enabledModules]);

  // Grouper les tuiles visibles par catégorie
  const tilesByGroup = useMemo(() => {
    const groups: Record<string, DashboardTile[]> = {
      help_academy: [],
      pilotage: [],
      support: [],
      projects: [],
      franchiseur: [],
      admin: [],
    };
    
    visibleTiles.forEach(tile => {
      groups[tile.group].push(tile);
    });
    
    return groups;
  }, [visibleTiles]);

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 sm:space-y-10">
      {/* Welcome section */}
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          Bienvenue sur <span className="text-primary">Help<span className="text-helpconfort-orange">!</span> Confort Services</span>
        </h1>
        <p className="text-muted-foreground">
          Votre espace centralisé pour piloter votre agence HelpConfort
        </p>
      </div>

      {/* HELP Academy Section */}
      {tilesByGroup.help_academy.length > 0 && (
        <section>
          <SectionHeader 
            title={<>Help<span className="text-helpconfort-orange">!</span> Academy</>}
            icon={DASHBOARD_GROUPS.help_academy.icon}
            colorClass={DASHBOARD_GROUPS.help_academy.colorClass}
            indexUrl={DASHBOARD_GROUPS.help_academy.indexUrl}
          />
          <div className="grid md:grid-cols-3 gap-4">
            {tilesByGroup.help_academy.map(tile => (
              <DashboardTileCard key={tile.id} tile={tile} />
            ))}
          </div>
        </section>
      )}

      {/* Pilotage Section */}
      {tilesByGroup.pilotage.length > 0 && (
        <section>
          <SectionHeader 
            title={DASHBOARD_GROUPS.pilotage.title}
            icon={DASHBOARD_GROUPS.pilotage.icon}
            colorClass={DASHBOARD_GROUPS.pilotage.colorClass}
            indexUrl={DASHBOARD_GROUPS.pilotage.indexUrl}
          />
          <div className="grid md:grid-cols-3 gap-4">
            {tilesByGroup.pilotage.map(tile => (
              <DashboardTileCard key={tile.id} tile={tile} />
            ))}
          </div>
        </section>
      )}

      {/* Support Section */}
      {tilesByGroup.support.length > 0 && (
        <section>
          <SectionHeader 
            title={DASHBOARD_GROUPS.support.title}
            icon={DASHBOARD_GROUPS.support.icon}
            colorClass={DASHBOARD_GROUPS.support.colorClass}
            indexUrl={DASHBOARD_GROUPS.support.indexUrl}
          />
          <div className="grid md:grid-cols-3 gap-4">
            {tilesByGroup.support.map(tile => (
              <DashboardTileCard 
                key={tile.id} 
                tile={tile} 
                dynamicBadge={tile.id === 'CONSOLE_SUPPORT' && newTicketsCount > 0 ? newTicketsCount : undefined}
              />
            ))}
          </div>
        </section>
      )}

      {/* Gestion de Projet Section */}
      {tilesByGroup.projects.length > 0 && (
        <section>
          <SectionHeader 
            title={DASHBOARD_GROUPS.projects.title}
            icon={DASHBOARD_GROUPS.projects.icon}
            colorClass={DASHBOARD_GROUPS.projects.colorClass}
            indexUrl={DASHBOARD_GROUPS.projects.indexUrl}
          />
          <div className="grid md:grid-cols-3 gap-4">
            {tilesByGroup.projects.map(tile => (
              <DashboardTileCard key={tile.id} tile={tile} />
            ))}
          </div>
        </section>
      )}

      {/* Franchiseur Section */}
      {tilesByGroup.franchiseur.length > 0 && (
        <section>
          <SectionHeader 
            title={DASHBOARD_GROUPS.franchiseur.title}
            icon={DASHBOARD_GROUPS.franchiseur.icon}
            colorClass={DASHBOARD_GROUPS.franchiseur.colorClass}
            indexUrl={DASHBOARD_GROUPS.franchiseur.indexUrl}
          />
          <div className="grid md:grid-cols-3 gap-4">
            {tilesByGroup.franchiseur.map(tile => (
              <DashboardTileCard key={tile.id} tile={tile} />
            ))}
          </div>
        </section>
      )}

      {/* Admin Section */}
      {tilesByGroup.admin.length > 0 && (
        <section>
          <SectionHeader 
            title={DASHBOARD_GROUPS.admin.title}
            icon={DASHBOARD_GROUPS.admin.icon}
            colorClass={DASHBOARD_GROUPS.admin.colorClass}
            indexUrl={DASHBOARD_GROUPS.admin.indexUrl}
          />
          <div className="grid md:grid-cols-4 gap-4">
            {tilesByGroup.admin.map(tile => (
              <DashboardTileCard key={tile.id} tile={tile} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function DashboardTileCard({ tile, dynamicBadge }: { tile: DashboardTile; dynamicBadge?: number }) {
  const Icon = tile.icon;
  const badgeContent = dynamicBadge ?? tile.badge;

  return (
    <Link to={tile.route}>
      <div className="group relative rounded-xl border border-helpconfort-blue/15 p-4
        bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-helpconfort-blue/10 via-white to-white
        shadow-sm transition-all duration-300 cursor-pointer border-l-4 border-l-helpconfort-blue
        hover:from-helpconfort-blue/20 hover:shadow-lg hover:-translate-y-0.5">
        {badgeContent && (
          <span className={`absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full z-10 ${
            typeof badgeContent === 'number' 
              ? 'bg-red-500 text-white animate-pulse min-w-[20px] text-center' 
              : 'bg-helpconfort-blue text-white text-[10px]'
          }`}>
            {badgeContent}
          </span>
        )}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-helpconfort-blue/30 flex-shrink-0 flex items-center justify-center bg-helpconfort-blue/10
            group-hover:border-helpconfort-blue transition-all">
            <Icon className="w-5 h-5 text-helpconfort-blue" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-foreground truncate">{tile.title}</p>
            <p className="text-xs text-muted-foreground truncate">{tile.description}</p>
          </div>
          <ArrowRight className="w-4 h-4 flex-shrink-0 text-muted-foreground group-hover:text-helpconfort-blue group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </Link>
  );
}

interface SectionHeaderProps {
  title: React.ReactNode;
  icon: LucideIcon;
  colorClass: string;
  indexUrl: string;
}

function SectionHeader({ title, icon: Icon, colorClass, indexUrl }: SectionHeaderProps) {
  return (
    <Link 
      to={indexUrl}
      className="group flex items-center justify-between mb-4 py-2 px-4 -mx-4 rounded-xl border border-transparent hover:border-border hover:bg-muted/80 hover:shadow-sm transition-all cursor-pointer"
    >
      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-muted group-hover:bg-background transition-colors`}>
          <Icon className={`w-4 h-4 ${colorClass}`} />
        </div>
        {title}
      </h2>
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground group-hover:text-primary transition-colors">
        <span className="hidden sm:inline text-xs font-medium">Voir tout</span>
        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
  );
}
