import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleCapabilities } from '@/config/roleMatrix';
import { ROUTES } from '@/config/routes';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  BarChart3, ListTodo, Tv, Users, Calendar,
  GraduationCap, FileText, FolderOpen, Heart,
  Headset, HelpCircle, LifeBuoy,
  Network, Building2, PieChart, GitCompare, Coins,
  Settings, Database, Activity, MessageCircle, Kanban, Sparkles, Brain, ToggleLeft,
  ClipboardList
} from 'lucide-react';

// Import des icônes personnalisées
import iconAccueil from '@/assets/menu-icons/accueil.png';
import iconMonAgence from '@/assets/menu-icons/mon-agence.png';
import iconAcademy from '@/assets/menu-icons/academy.png';
import iconSupport from '@/assets/menu-icons/support.png';
import iconGestionProjet from '@/assets/menu-icons/gestion-projet.png';
import iconFranchiseur from '@/assets/menu-icons/franchiseur.png';
import iconAdministration from '@/assets/menu-icons/administration.png';
import iconRh from '@/assets/menu-icons/rh.png';


interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  description?: string;
}

interface NavSection {
  id: string;
  label: string;
  icon: string;
  indexUrl: string;
  items: NavItem[];
  accessKey?: 'canAccessHelpAcademy' | 'canAccessPilotageAgence' | 'canAccessSupport' | 'canAccessFranchiseur' | 'canAccessAdmin';
  requiresModule?: string;
}

const navSections: NavSection[] = [
  {
    id: 'home',
    label: 'Accueil',
    icon: iconAccueil,
    indexUrl: '/',
    items: [],
  },
  {
    id: 'academy',
    label: 'Academy',
    icon: iconAcademy,
    indexUrl: ROUTES.academy.index,
    items: [
      { title: 'Guide Apogée', url: ROUTES.academy.apogee, icon: GraduationCap },
      { title: 'Guide Apporteurs', url: ROUTES.academy.apporteurs, icon: FileText },
      { title: 'Base Documentaire', url: ROUTES.academy.documents, icon: FolderOpen },
      { title: 'Mes Favoris', url: ROUTES.academy.favorites, icon: Heart },
    ],
    accessKey: 'canAccessHelpAcademy',
    requiresModule: 'help_academy',
  },
  {
    id: 'agence',
    label: 'Mon Agence',
    icon: iconMonAgence,
    indexUrl: ROUTES.pilotage.index,
    items: [
      { title: 'Mes Indicateurs', url: ROUTES.pilotage.statsHub, icon: PieChart },
      { title: 'Actions à Mener', url: ROUTES.pilotage.actions, icon: ListTodo },
      { title: 'Commercial', url: ROUTES.pilotage.commercial, icon: BarChart3 },
      { title: 'Diffusion', url: ROUTES.pilotage.diffusion, icon: Tv },
      { title: 'Validation plannings', url: ROUTES.pilotage.rhTech, icon: Calendar },
    ],
    accessKey: 'canAccessPilotageAgence',
    requiresModule: 'pilotage_agence',
  },
  {
    id: 'rh',
    label: 'RH',
    icon: iconRh,
    indexUrl: ROUTES.rh.index,
    items: [
      { title: 'Mon équipe', url: ROUTES.rh.equipe, icon: Users },
      { title: 'Mon Coffre RH', url: ROUTES.rh.coffre, icon: FolderOpen },
      { title: 'Demandes RH', url: ROUTES.rh.demandes, icon: FileText },
    ],
    requiresModule: 'rh',
  },
  {
    id: 'support',
    label: 'Support',
    icon: iconSupport,
    indexUrl: ROUTES.support.index,
    items: [
      { title: 'Support', url: ROUTES.support.index, icon: HelpCircle },
      { title: 'Console Support', url: ROUTES.support.console, icon: Headset },
    ],
    accessKey: 'canAccessSupport',
  },
  {
    id: 'projects',
    label: 'Gestion de Projet',
    icon: iconGestionProjet,
    indexUrl: ROUTES.projects.index,
    items: [
      { title: 'Kanban', url: ROUTES.projects.kanban, icon: Kanban },
      { title: 'Liste', url: ROUTES.projects.list, icon: ListTodo },
      { title: 'IA-IA (Doublons)', url: ROUTES.projects.duplicates, icon: GitCompare },
      
      { title: 'Tickets incomplets', url: ROUTES.projects.incomplete, icon: FileText },
    ],
    requiresModule: 'apogee_tickets',
  },
  {
    id: 'franchiseur',
    label: 'Franchiseur',
    icon: iconFranchiseur,
    indexUrl: ROUTES.reseau.index,
    items: [
      { title: 'Dashboard Réseau', url: ROUTES.reseau.dashboard, icon: Network },
      { title: 'Agences', url: ROUTES.reseau.agences, icon: Building2 },
      { title: 'Animateurs', url: ROUTES.reseau.animateurs, icon: Users },
      { title: 'Tableaux', url: ROUTES.reseau.tableaux, icon: PieChart },
      { title: 'Périodes', url: ROUTES.reseau.periodes, icon: GitCompare },
      { title: 'Redevances', url: ROUTES.reseau.redevances, icon: Coins },
    ],
    accessKey: 'canAccessFranchiseur',
  },
  {
    id: 'admin',
    label: 'Administration',
    icon: iconAdministration,
    indexUrl: ROUTES.admin.index,
    items: [], // Pas de dropdown - lien direct vers la page admin
    accessKey: 'canAccessAdmin',
  },
];

export function IconNavBar() {
  const location = useLocation();
  const { globalRole, agence, hasModule } = useAuth();
  const caps = getRoleCapabilities(globalRole);
  const [openPopover, setOpenPopover] = useState<string | null>(null);

  const filteredSections = navSections.filter(section => {
    // Module check
    if (section.requiresModule && !hasModule(section.requiresModule as any)) {
      return false;
    }
    // Access check
    if (!section.accessKey) return true;
    if (section.accessKey === 'canAccessPilotageAgence') {
      if (caps.requiresAgencyForPilotage && !agence) return false;
    }
    return caps[section.accessKey];
  });

  // Détermine si une SECTION (icône du menu) est active
  const isSectionActive = (sectionId: string, indexUrl: string) => {
    const path = location.pathname;
    
    if (sectionId === 'home') return path === '/';
    
    // Routes exclusives RH (toutes sous /rh/)
    const isRhRoute = path.startsWith('/rh');
    
    if (sectionId === 'rh') return isRhRoute;
    
    if (sectionId === 'agence') {
      if (isRhRoute) return false;
      const agenceRoutes = ['/hc-agency', '/indicateurs', '/pilotage'];
      return agenceRoutes.some(r => path.startsWith(r));
    }
    
    return path.startsWith(indexUrl);
  };

  // Détermine si un ITEM du dropdown est actif (match exact ou préfixe direct)
  const isItemActive = (itemUrl: string) => {
    const path = location.pathname;
    // Match exact ou sous-route directe
    return path === itemUrl || path.startsWith(itemUrl + '/');
  };

  const handleNavClick = (sectionId: string) => {
    setOpenPopover(openPopover === sectionId ? null : sectionId);
  };

  return (
    <nav className="flex items-center gap-1 px-2">
      {filteredSections.map((section) => {
        const hasDropdown = section.items.length > 0;
        const active = isSectionActive(section.id, section.indexUrl);

        if (!hasDropdown) {
          // Simple link (Accueil)
          return (
            <Link
              key={section.id}
              to={section.indexUrl}
              className={cn(
                "flex flex-col items-center justify-center p-1.5 rounded-lg transition-all hover:bg-muted/50 group",
                active && "bg-primary/10"
              )}
              title={section.label}
            >
              <img 
                src={section.icon} 
                alt={section.label} 
                className={cn(
                  "h-8 w-8 object-contain transition-transform group-hover:scale-110",
                  active && "scale-110"
                )}
              />
            </Link>
          );
        }

        // Dropdown menu
        return (
          <Popover 
            key={section.id} 
            open={openPopover === section.id}
            onOpenChange={(open) => setOpenPopover(open ? section.id : null)}
          >
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "flex flex-col items-center justify-center p-1.5 rounded-lg transition-all hover:bg-muted/50 group cursor-pointer",
                  active && "bg-primary/10",
                  openPopover === section.id && "bg-muted"
                )}
                title={section.label}
              >
                <img 
                  src={section.icon} 
                  alt={section.label} 
                  className={cn(
                    "h-8 w-8 object-contain transition-transform group-hover:scale-110",
                    active && "scale-110"
                  )}
                />
              </button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-56 p-2" 
              align="start"
              sideOffset={8}
            >
              <div className="space-y-1">
                <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground border-b mb-2">
                  {section.label}
                </div>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const itemActive = isItemActive(item.url);
                  return (
                    <Link
                      key={item.url}
                      to={item.url}
                      onClick={() => setOpenPopover(null)}
                      className={cn(
                        "flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors hover:bg-muted",
                        itemActive && "bg-primary/10 text-primary font-medium"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </Link>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        );
      })}
    </nav>
  );
}
