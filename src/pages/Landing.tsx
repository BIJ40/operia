import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DASHBOARD_TILES, DASHBOARD_GROUPS, DashboardTile } from '@/config/dashboardTiles';
import { useMemo, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getRoleCapabilities, canAccessTileGroup, canAccessTile, TileGroup } from '@/config/roleMatrix';
import { LucideIcon } from 'lucide-react';

export default function Landing() {
  const { agence, globalRole, canAccessSupportConsole } = useAuth();
  const [pendingTicketsCount, setPendingTicketsCount] = useState<number>(0);

  // V2: Capacités basées sur ROLE_MATRIX
  const caps = getRoleCapabilities(globalRole);

  // Fetch pending tickets count for support console users
  useEffect(() => {
    if (!canAccessSupportConsole) return;

    const fetchPendingCount = async () => {
      const { count, error } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .in('status', ['new', 'in_progress', 'waiting_user']);

      if (!error && count !== null) {
        setPendingTicketsCount(count);
      }
    };

    fetchPendingCount();

    const channel = supabase
      .channel('pending-tickets-count')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets' },
        () => fetchPendingCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [canAccessSupportConsole]);

  // V2: Filtrer les tuiles basé sur ROLE_MATRIX + canAccessSupportConsole de AuthContext
  const visibleTiles = useMemo(() => {
    return DASHBOARD_TILES.filter(tile => {
      // 1. Vérifier l'accès au groupe
      const groupAccess = canAccessTileGroup(globalRole, tile.group as TileGroup, { agence });
      if (!groupAccess) return false;
      
      // 2. Vérifier l'accès à la tuile spécifique (passer canAccessSupportConsole pour CONSOLE_SUPPORT)
      return canAccessTile(globalRole, tile.id, { agence, canAccessSupportConsole });
    });
  }, [globalRole, agence, canAccessSupportConsole]);

  // Grouper les tuiles visibles par catégorie
  const tilesByGroup = useMemo(() => {
    const groups: Record<string, DashboardTile[]> = {
      help_academy: [],
      pilotage: [],
      support: [],
      franchiseur: [],
      admin: [],
    };
    
    visibleTiles.forEach(tile => {
      groups[tile.group].push(tile);
    });
    
    return groups;
  }, [visibleTiles]);

  return (
    <div className="container mx-auto px-6 py-8 space-y-10">
      {/* Welcome section */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Bienvenue sur <span className="text-primary">Help<span className="text-orange-500">!</span> Confort Services</span>
        </h1>
        <p className="text-muted-foreground">
          Votre espace centralisé pour piloter votre agence HelpConfort
        </p>
      </div>

      {/* HELP Academy Section */}
      {tilesByGroup.help_academy.length > 0 && (
        <section>
          <SectionHeader 
            title={<><span>Help</span><span className="text-helpconfort-orange animate-pulse">!</span><span> Academy</span></>}
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
                dynamicBadge={tile.id === 'CONSOLE_SUPPORT' && pendingTicketsCount > 0 ? pendingTicketsCount : undefined}
              />
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
  const colorClasses = {
    primary: 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground',
    accent: 'bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground',
  };

  const badgeContent = dynamicBadge ?? tile.badge;

  return (
    <Link to={tile.route}>
      <Card className="group hover:shadow-lg hover:border-primary/30 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer relative">
        {badgeContent && (
          <span className={`absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full z-10 ${
            typeof badgeContent === 'number' 
              ? 'bg-red-500 text-white animate-pulse min-w-[20px] text-center' 
              : 'bg-orange-500 text-white text-[10px]'
          }`}>
            {badgeContent}
          </span>
        )}
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center transition-colors ${colorClasses[tile.color]}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-medium truncate">{tile.title}</CardTitle>
              <CardDescription className="text-xs truncate">{tile.description}</CardDescription>
            </div>
            <ArrowRight className="w-4 h-4 flex-shrink-0 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>
        </CardContent>
      </Card>
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
