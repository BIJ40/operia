import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { DASHBOARD_TILES, DASHBOARD_GROUPS, DashboardTile } from '@/config/dashboardTiles';
import { useMemo, memo } from 'react';
import { getRoleCapabilities, canAccessTileGroup, canAccessTile, TileGroup } from '@/config/roleMatrix';
import { isModuleEnabled, isModuleOptionEnabled, ModuleKey } from '@/types/modules';
import { useSupportNotifications } from '@/hooks/use-support-notifications';
import { CollapsibleSection } from '@/components/dashboard/CollapsibleSection';
import { ROUTES } from '@/config/routes';

export default function Landing() {
  const { agence, globalRole, canAccessSupportConsoleUI, enabledModules } = useAuth();
  
  // Utiliser le même hook que le header pour synchroniser les compteurs
  const { newTicketsCount } = useSupportNotifications();

  // V2: Capacités basées sur ROLE_MATRIX
  const caps = getRoleCapabilities(globalRole);
  const isPlatformAdmin = globalRole === 'superadmin' || globalRole === 'platform_admin';

  // V2: Filtrer les tuiles basé sur ROLE_MATRIX + canAccessSupportConsole de AuthContext
  const visibleTiles = useMemo(() => {
    return DASHBOARD_TILES.filter(tile => {
      const isAdminUser = globalRole === 'superadmin' || globalRole === 'platform_admin';
      
      // F-NAV-4: Vérifier requiresFranchisor (N3+)
      if (tile.requiresFranchisor && !caps.canAccessFranchiseur && !isAdminUser) {
        return false;
      }
      
      // F-NAV-6: Pour les tiles admin, vérifier au niveau tile pas groupe
      // Permet à ADMIN_USERS (requiresFranchisor) d'être visible pour N3+
      if (tile.group === 'admin') {
        if (tile.requiresAdmin && !caps.canAccessAdmin) return false;
        if (tile.requiresFranchisor && !caps.canAccessFranchiseur && !isAdminUser) return false;
        return canAccessTile(globalRole, tile.id, { agence, canAccessSupportConsoleUI });
      }
      
      // 1. Vérifier si la tuile nécessite un module spécifique
      if (tile.requiresModule) {
        if (isAdminUser) {
          // Admins voient tout
        } else {
          const hasModule = isModuleEnabled(enabledModules, tile.requiresModule);
          if (!hasModule) return false;
          
          if (tile.requiresModuleOption) {
            if (!isModuleOptionEnabled(enabledModules, tile.requiresModule as ModuleKey, tile.requiresModuleOption)) {
              return false;
            }
          }
          
          if (tile.requiresModuleOptions && tile.requiresModuleOptions.length > 0) {
            const hasAnyOption = tile.requiresModuleOptions.some(opt => 
              isModuleOptionEnabled(enabledModules, tile.requiresModule as ModuleKey, opt)
            );
            if (!hasAnyOption) return false;
          }
          
          return canAccessTile(globalRole, tile.id, { agence, canAccessSupportConsoleUI });
        }
      } else {
        const groupAccess = canAccessTileGroup(globalRole, tile.group as TileGroup, { agence });
        if (!groupAccess) return false;
      }
      
      return canAccessTile(globalRole, tile.id, { agence, canAccessSupportConsoleUI });
    });
  }, [globalRole, agence, canAccessSupportConsoleUI, enabledModules, caps]);

  // Grouper les tuiles visibles par catégorie
  const tilesByGroup = useMemo(() => {
    const groups: Record<string, DashboardTile[]> = {
      help_academy: [],
      pilotage: [],
      rh: [],
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
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Welcome section */}
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          Bienvenue sur <span className="text-primary">Help<span className="text-helpconfort-orange">!</span> Confort Services</span>
        </h1>
        <p className="text-muted-foreground">
          Votre espace centralisé pour piloter votre agence HelpConfort
        </p>
      </div>

      {/* 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Colonne gauche */}
        <div className="space-y-6">
          {/* HELP Academy Section */}
          {tilesByGroup.help_academy.length > 0 && (
            <CollapsibleSection
              id="help_academy"
              title={<>Help<span className="text-helpconfort-orange">!</span> Academy</>}
              icon={DASHBOARD_GROUPS.help_academy.icon}
              colorClass={DASHBOARD_GROUPS.help_academy.colorClass}
              href="/academy"
              defaultOpen={false}
            >
              {tilesByGroup.help_academy.map(tile => (
                <DashboardTileCard key={tile.id} tile={tile} isPlatformAdmin={isPlatformAdmin} />
              ))}
            </CollapsibleSection>
          )}

          {/* Support Section */}
          {tilesByGroup.support.length > 0 && (
            <CollapsibleSection
              id="support"
              title={DASHBOARD_GROUPS.support.title}
              icon={DASHBOARD_GROUPS.support.icon}
              colorClass={DASHBOARD_GROUPS.support.colorClass}
              href="/support"
              defaultOpen={false}
            >
              {tilesByGroup.support.map(tile => (
                <DashboardTileCard 
                  key={tile.id} 
                  tile={tile} 
                  isPlatformAdmin={isPlatformAdmin}
                  dynamicBadge={tile.id === 'CONSOLE_SUPPORT' && newTicketsCount > 0 ? newTicketsCount : undefined}
                />
              ))}
            </CollapsibleSection>
          )}

          {/* Gestion de Projet Section */}
          {tilesByGroup.projects.length > 0 && (
            <CollapsibleSection
              id="projects"
              title={DASHBOARD_GROUPS.projects.title}
              icon={DASHBOARD_GROUPS.projects.icon}
              colorClass={DASHBOARD_GROUPS.projects.colorClass}
              href="/projects"
              defaultOpen={false}
            >
              {tilesByGroup.projects.map(tile => (
                <DashboardTileCard key={tile.id} tile={tile} isPlatformAdmin={isPlatformAdmin} />
              ))}
            </CollapsibleSection>
          )}

          {/* Admin Section */}
          {tilesByGroup.admin.length > 0 && (
            <CollapsibleSection
              id="admin"
              title={DASHBOARD_GROUPS.admin.title}
              icon={DASHBOARD_GROUPS.admin.icon}
              colorClass={DASHBOARD_GROUPS.admin.colorClass}
              href="/admin"
              defaultOpen={false}
            >
              {tilesByGroup.admin.map(tile => (
                <DashboardTileCard key={tile.id} tile={tile} isPlatformAdmin={isPlatformAdmin} />
              ))}
            </CollapsibleSection>
          )}
        </div>

        {/* Colonne droite */}
        <div className="space-y-6">
          {/* Pilotage Section */}
          {tilesByGroup.pilotage.length > 0 && (
            <CollapsibleSection
              id="pilotage"
              title={DASHBOARD_GROUPS.pilotage.title}
              icon={DASHBOARD_GROUPS.pilotage.icon}
              colorClass={DASHBOARD_GROUPS.pilotage.colorClass}
              href={ROUTES.pilotage.index}
              defaultOpen={false}
            >
              {tilesByGroup.pilotage.map(tile => (
                <DashboardTileCard key={tile.id} tile={tile} isPlatformAdmin={isPlatformAdmin} />
              ))}
            </CollapsibleSection>
          )}

          {/* Section RH */}
          {tilesByGroup.rh.length > 0 && (
            <CollapsibleSection
              id="rh"
              title={DASHBOARD_GROUPS.rh.title}
              icon={DASHBOARD_GROUPS.rh.icon}
              colorClass={DASHBOARD_GROUPS.rh.colorClass}
              href={ROUTES.pilotage.monCoffreRh}
              defaultOpen={false}
            >
              {tilesByGroup.rh.map(tile => (
                <DashboardTileCard key={tile.id} tile={tile} isPlatformAdmin={isPlatformAdmin} />
              ))}
            </CollapsibleSection>
          )}

          {/* Franchiseur Section */}
          {tilesByGroup.franchiseur.length > 0 && (
            <CollapsibleSection
              id="franchiseur"
              title={DASHBOARD_GROUPS.franchiseur.title}
              icon={DASHBOARD_GROUPS.franchiseur.icon}
              colorClass={DASHBOARD_GROUPS.franchiseur.colorClass}
              href="/hc-reseau"
              defaultOpen={false}
            >
              {tilesByGroup.franchiseur.map(tile => (
                <DashboardTileCard key={tile.id} tile={tile} isPlatformAdmin={isPlatformAdmin} />
              ))}
            </CollapsibleSection>
          )}
        </div>
      </div>
    </div>
  );
}

const DashboardTileCard = memo(function DashboardTileCard({ tile, dynamicBadge, isPlatformAdmin }: { tile: DashboardTile; dynamicBadge?: number; isPlatformAdmin?: boolean }) {
  const Icon = tile.icon;
  const badgeContent = dynamicBadge ?? tile.badge;
  // P1 FIX: Les tuiles disabled ne sont JAMAIS cliquables, même pour les admins
  // Les admins voient la tuile mais ne peuvent pas cliquer dessus
  const isDisabled = tile.isDisabled === true;

  const content = (
    <div className={`
      group relative rounded-xl border border-helpconfort-blue/15 p-4
      bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-helpconfort-blue/10 via-white to-white
      dark:via-background dark:to-background
      shadow-sm transition-all duration-300 border-l-4 border-l-helpconfort-blue
      min-w-[240px] md:min-w-0 snap-start
      ${isDisabled 
        ? 'opacity-50 cursor-not-allowed' 
        : 'cursor-pointer hover:from-helpconfort-blue/20 hover:shadow-lg hover:-translate-y-0.5'
      }
    `}>
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
        <div className={`w-12 h-12 rounded-full border-2 border-helpconfort-blue/30 flex-shrink-0 flex items-center justify-center bg-helpconfort-blue/10
          ${!isDisabled && 'group-hover:border-helpconfort-blue'} transition-all`}>
          <Icon className="w-6 h-6 text-helpconfort-blue" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-foreground truncate">{tile.title}</p>
          <p className="text-xs text-muted-foreground truncate">{tile.description}</p>
        </div>
        <ArrowRight className={`w-4 h-4 flex-shrink-0 text-muted-foreground ${!isDisabled && 'group-hover:text-helpconfort-blue group-hover:translate-x-0.5'} transition-all`} aria-hidden="true" />
      </div>
    </div>
  );

  // P1 FIX: Ne jamais rendre cliquable une tuile disabled
  if (isDisabled) {
    return content;
  }

  return <Link to={tile.route}>{content}</Link>;
});
