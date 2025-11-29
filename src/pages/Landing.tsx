import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DASHBOARD_TILES, DASHBOARD_GROUPS, DashboardTile } from '@/config/dashboardTiles';
import { useMemo, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getRoleCapabilities, canAccessTileGroup, canAccessTile, TileGroup } from '@/config/roleMatrix';

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
          Bienvenue sur <span className="text-primary">HC Services</span>
        </h1>
        <p className="text-muted-foreground">
          Votre espace centralisé pour piloter votre agence HelpConfort
        </p>
      </div>

      {/* HELP Academy Section */}
      {tilesByGroup.help_academy.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <DASHBOARD_GROUPS.help_academy.icon className={`w-5 h-5 ${DASHBOARD_GROUPS.help_academy.colorClass}`} />
            <span>Help</span><span className="text-helpconfort-orange animate-pulse">!</span><span> Academy</span>
          </h2>
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
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <DASHBOARD_GROUPS.pilotage.icon className={`w-5 h-5 ${DASHBOARD_GROUPS.pilotage.colorClass}`} />
            {DASHBOARD_GROUPS.pilotage.title}
          </h2>
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
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <DASHBOARD_GROUPS.support.icon className={`w-5 h-5 ${DASHBOARD_GROUPS.support.colorClass}`} />
            {DASHBOARD_GROUPS.support.title}
          </h2>
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
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <DASHBOARD_GROUPS.franchiseur.icon className={`w-5 h-5 ${DASHBOARD_GROUPS.franchiseur.colorClass}`} />
            {DASHBOARD_GROUPS.franchiseur.title}
          </h2>
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
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <DASHBOARD_GROUPS.admin.icon className={`w-5 h-5 ${DASHBOARD_GROUPS.admin.colorClass}`} />
            {DASHBOARD_GROUPS.admin.title}
          </h2>
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
      <Card className="group h-full hover:shadow-lg hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 cursor-pointer relative">
        {badgeContent && (
          <span className={`absolute bottom-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full z-10 ${
            typeof badgeContent === 'number' 
              ? 'bg-red-500 text-white animate-pulse min-w-[24px] text-center' 
              : 'bg-orange-500 text-white text-[10px]'
          }`}>
            {badgeContent}
          </span>
        )}
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${colorClasses[tile.color]}`}>
              <Icon className="w-6 h-6" />
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
        </CardHeader>
        <CardContent>
          <CardTitle className="text-lg mb-1">{tile.title}</CardTitle>
          <CardDescription className="text-sm">{tile.description}</CardDescription>
        </CardContent>
      </Card>
    </Link>
  );
}
