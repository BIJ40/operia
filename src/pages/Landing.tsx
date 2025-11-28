import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, BarChart3, MessageSquare, Network, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DASHBOARD_TILES, DASHBOARD_GROUPS, DashboardTile } from '@/config/dashboardTiles';
import { useMemo } from 'react';

export default function Landing() {
  const { canViewScope, isFranchiseur, isAdmin } = useAuth();

  // Filtrer les tuiles par permissions
  const visibleTiles = useMemo(() => {
    return DASHBOARD_TILES.filter(tile => {
      // Cas spécial admin : nécessite le rôle admin
      if (tile.requiresAdmin) {
        return isAdmin && canViewScope(tile.scopeSlug);
      }
      // Cas spécial franchiseur : nécessite le rôle + le scope
      if (tile.group === 'franchiseur') {
        return (isFranchiseur || isAdmin) && canViewScope(tile.scopeSlug);
      }
      return canViewScope(tile.scopeSlug);
    });
  }, [canViewScope, isFranchiseur, isAdmin]);

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
            <BookOpen className={`w-5 h-5 ${DASHBOARD_GROUPS.help_academy.colorClass}`} />
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
            <BarChart3 className={`w-5 h-5 ${DASHBOARD_GROUPS.pilotage.colorClass}`} />
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
            <MessageSquare className={`w-5 h-5 ${DASHBOARD_GROUPS.support.colorClass}`} />
            {DASHBOARD_GROUPS.support.title}
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {tilesByGroup.support.map(tile => (
              <DashboardTileCard key={tile.id} tile={tile} />
            ))}
          </div>
        </section>
      )}

      {/* Franchiseur Section */}
      {tilesByGroup.franchiseur.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Network className={`w-5 h-5 ${DASHBOARD_GROUPS.franchiseur.colorClass}`} />
            {DASHBOARD_GROUPS.franchiseur.title}
          </h2>
          <div className="max-w-md">
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
            <Settings className={`w-5 h-5 ${DASHBOARD_GROUPS.admin.colorClass}`} />
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

function DashboardTileCard({ tile }: { tile: DashboardTile }) {
  const Icon = tile.icon;
  const colorClasses = {
    primary: 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground',
    accent: 'bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground',
  };

  return (
    <Link to={tile.route}>
      <Card className="group h-full hover:shadow-lg hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 cursor-pointer">
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
