/**
 * HubHome - Page Hub Central après login
 * 
 * Affiche des tuiles par section selon les rôles et modules de l'utilisateur.
 * Navigation expérimentale (USE_EXPERIMENTAL_NAV = true)
 */

import { useNavigate } from 'react-router-dom';
import { 
  GraduationCap, Building2, Network, Headset, 
  FolderKanban, Briefcase, Sparkles, Settings,
  ArrowRight
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleCapabilities } from '@/config/roleMatrix';
import { ROUTES } from '@/config/routes';
import { cn } from '@/lib/utils';

interface HubTile {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  route: string;
  colorClass: string;
  checkAccess: () => boolean;
}

export default function HubHome() {
  const navigate = useNavigate();
  const { globalRole, agence, hasModule, isAdmin } = useAuth();
  const caps = getRoleCapabilities(globalRole);

  const hubTiles: HubTile[] = [
    {
      id: 'academy',
      title: 'Help! Academy',
      description: 'Guides Apogée, Apporteurs et documentation HelpConfort',
      icon: GraduationCap,
      route: ROUTES.academy.index,
      colorClass: 'border-l-helpconfort-blue bg-gradient-to-br from-helpconfort-blue/5 to-transparent hover:from-helpconfort-blue/10',
      checkAccess: () => caps.canAccessHelpAcademy && hasModule('help_academy'),
    },
    {
      id: 'agence',
      title: 'Mon Agence',
      description: 'Statistiques, équipe, actions à mener et pilotage',
      icon: Building2,
      route: ROUTES.pilotage.index,
      colorClass: 'border-l-helpconfort-orange bg-gradient-to-br from-helpconfort-orange/5 to-transparent hover:from-helpconfort-orange/10',
      checkAccess: () => {
        if (caps.requiresAgencyForPilotage && !agence) return false;
        return caps.canAccessPilotageAgence && hasModule('pilotage_agence');
      },
    },
    {
      id: 'reseau',
      title: 'Réseau HelpConfort',
      description: 'Vision multi-agences, comparatifs et redevances',
      icon: Network,
      route: ROUTES.reseau.index,
      colorClass: 'border-l-purple-500 bg-gradient-to-br from-purple-500/5 to-transparent hover:from-purple-500/10',
      checkAccess: () => caps.canAccessFranchiseur && hasModule('reseau_franchiseur'),
    },
    {
      id: 'projects',
      title: 'Gestion de Projet',
      description: 'Kanban, tickets et suivi du développement Apogée',
      icon: FolderKanban,
      route: ROUTES.projects.index,
      colorClass: 'border-l-green-500 bg-gradient-to-br from-green-500/5 to-transparent hover:from-green-500/10',
      checkAccess: () => hasModule('apogee_tickets'),
    },
    {
      id: 'rh',
      title: 'RH & Parc',
      description: 'Ressources humaines, véhicules et équipements',
      icon: Briefcase,
      route: ROUTES.pilotage.monCoffreRh,
      colorClass: 'border-l-amber-500 bg-gradient-to-br from-amber-500/5 to-transparent hover:from-amber-500/10',
      checkAccess: () => hasModule('rh') || hasModule('parc'),
    },
    {
      id: 'support',
      title: 'Support & Aide',
      description: 'Chat IA, tickets de support et assistance',
      icon: Headset,
      route: ROUTES.support.index,
      colorClass: 'border-l-teal-500 bg-gradient-to-br from-teal-500/5 to-transparent hover:from-teal-500/10',
      checkAccess: () => caps.canAccessSupport,
    },
    {
      id: 'statia',
      title: 'StatIA by BIJ',
      description: 'Moteur de statistiques intelligent et requêtes avancées',
      icon: Sparkles,
      route: ROUTES.admin.statia,
      colorClass: 'border-l-pink-500 bg-gradient-to-br from-pink-500/5 to-transparent hover:from-pink-500/10',
      checkAccess: () => isAdmin || hasModule('unified_search'),
    },
    {
      id: 'admin',
      title: 'Administration',
      description: 'Gestion utilisateurs, agences et configuration',
      icon: Settings,
      route: ROUTES.admin.index,
      colorClass: 'border-l-slate-500 bg-gradient-to-br from-slate-500/5 to-transparent hover:from-slate-500/10',
      checkAccess: () => caps.canAccessAdmin && hasModule('admin_plateforme'),
    },
  ];

  const accessibleTiles = hubTiles.filter(tile => tile.checkAccess());

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Bienvenue sur HelpConfort Services
        </h1>
        <p className="text-muted-foreground text-lg">
          Choisissez votre espace de travail
        </p>
      </div>

      {/* Tiles Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {accessibleTiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <Card
              key={tile.id}
              className={cn(
                "border-l-4 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 group",
                tile.colorClass
              )}
              onClick={() => navigate(tile.route)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-muted/50 group-hover:bg-muted transition-colors">
                    <Icon className="w-6 h-6 text-foreground/70" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <CardTitle className="text-lg mt-3">{tile.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  {tile.description}
                </CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty state */}
      {accessibleTiles.length === 0 && (
        <div className="text-center py-16">
          <p className="text-muted-foreground">
            Aucun module n'est actuellement accessible. Contactez votre administrateur.
          </p>
        </div>
      )}

      {/* Raccourci clavier */}
      <div className="mt-10 text-center">
        <p className="text-sm text-muted-foreground">
          Appuyez sur <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">⌘K</kbd> ou{' '}
          <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Ctrl+K</kbd> pour une navigation rapide
        </p>
      </div>
    </div>
  );
}
