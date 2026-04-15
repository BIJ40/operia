/**
 * WorkspaceSidebar - Navigation latérale principale (remplace le header)
 * Fond bleu, texte blanc
 * Sections : Accueil, PILOTAGE, SUIVI CLIENT, Support, Admin, Profil
 */
import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarFooter,
  SidebarHeader,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Home,
  BarChart3,
  Building2,
  Users,
  Layers,
  Map,
  CalendarClock,
  Wallet,
  Eye,
  PieChart,
  Settings,
  AlertTriangle,
  Bell,
  Link2,
  CreditCard,
  ScrollText,
  Handshake,
  Plus,
  ListChecks,
  MessagesSquare,
  ChevronRight,
  Headphones,
  Shield,
  User,
  LogOut,
  ChevronsUpDown,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthCore } from '@/contexts/AuthCoreContext';

export type SidebarView =
  | 'accueil'
  // Pilotage > Statistiques
  | 'stats-general'
  | 'stats-apporteurs'
  | 'stats-techniciens'
  | 'stats-univers'
  | 'stats-mapping'
  // Pilotage > Analytique
  | 'analytique-previsionnel'
  | 'analytique-recouvrement'
  | 'analytique-veille'
  | 'analytique-rentabilite'
  // Pilotage > Opérationnel
  | 'operationnel-actions'
  | 'operationnel-alertes'
  | 'operationnel-incoherences'
  // Suivi > Lien de suivi
  | 'suivi-parametres'
  | 'suivi-paiements'
  | 'suivi-journal'
  // Suivi > Espace apporteurs
  | 'apporteurs-creation'
  | 'apporteurs-gestion'
  | 'apporteurs-echanges'
  // Others
  | 'support'
  | 'admin';

interface SubItem {
  id: SidebarView;
  label: string;
  icon: LucideIcon;
}

interface Category {
  label: string;
  icon: LucideIcon;
  items: SubItem[];
}

interface Section {
  title: string;
  categories: Category[];
}

const SIDEBAR_SECTIONS: Section[] = [
  {
    title: 'PILOTAGE',
    categories: [
      {
        label: 'Statistiques',
        icon: BarChart3,
        items: [
          { id: 'stats-general', label: 'Général', icon: BarChart3 },
          { id: 'stats-apporteurs', label: 'Apporteurs', icon: Building2 },
          { id: 'stats-techniciens', label: 'Techniciens', icon: Users },
          { id: 'stats-univers', label: 'Univers', icon: Layers },
          { id: 'stats-mapping', label: 'Mapping', icon: Map },
        ],
      },
      {
        label: 'Analytique',
        icon: PieChart,
        items: [
          { id: 'analytique-previsionnel', label: 'Prévisionnel', icon: CalendarClock },
          { id: 'analytique-recouvrement', label: 'Recouvrement', icon: Wallet },
          { id: 'analytique-veille', label: 'Veille Clientèle', icon: Eye },
          { id: 'analytique-rentabilite', label: 'Rentabilité dossier', icon: PieChart },
        ],
      },
      {
        label: 'Opérationnel',
        icon: Settings,
        items: [
          { id: 'operationnel-actions', label: 'Actions à mener', icon: ListChecks },
          { id: 'operationnel-alertes', label: 'Alertes', icon: Bell },
          { id: 'operationnel-incoherences', label: 'Incohérences', icon: AlertTriangle },
        ],
      },
    ],
  },
  {
    title: 'SUIVI CLIENT',
    categories: [
      {
        label: 'Lien de suivi',
        icon: Link2,
        items: [
          { id: 'suivi-parametres', label: 'Paramètres', icon: Settings },
          { id: 'suivi-paiements', label: 'Paiements reçus', icon: CreditCard },
          { id: 'suivi-journal', label: "Journal d'envois", icon: ScrollText },
        ],
      },
      {
        label: 'Espace apporteurs',
        icon: Handshake,
        items: [
          { id: 'apporteurs-creation', label: 'Création', icon: Plus },
          { id: 'apporteurs-gestion', label: 'Gestion', icon: ListChecks },
          { id: 'apporteurs-echanges', label: 'Échanges', icon: MessagesSquare },
        ],
      },
    ],
  },
];

/** Which subscription plan a view requires */
export function getRequiredPlan(view: SidebarView): 'pilotage' | 'suivi' | null {
  if (view.startsWith('stats-') || view.startsWith('analytique-') || view.startsWith('operationnel-')) return 'pilotage';
  if (view.startsWith('suivi-') || view.startsWith('apporteurs-')) return 'suivi';
  return null;
}

interface WorkspaceSidebarProps {
  activeView: SidebarView;
  onViewChange: (view: SidebarView) => void;
  showAdmin?: boolean;
}

export function WorkspaceSidebar({ activeView, onViewChange, showAdmin }: WorkspaceSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { user, logout } = useAuthCore();

  const isInCategory = useCallback(
    (cat: Category) => cat.items.some((i) => i.id === activeView),
    [activeView],
  );

  return (
    <Sidebar
      collapsible="icon"
      className="border-r-0"
      style={{
        '--sidebar-background': '220 65% 28%',
        '--sidebar-foreground': '0 0% 100%',
        '--sidebar-accent': '220 65% 35%',
        '--sidebar-accent-foreground': '0 0% 100%',
        '--sidebar-border': '220 50% 40%',
        '--sidebar-primary': '0 0% 100%',
        '--sidebar-primary-foreground': '220 65% 28%',
        '--sidebar-ring': '220 65% 50%',
      } as React.CSSProperties}
    >
      {/* Header / Logo */}
      <SidebarHeader className="px-4 py-4">
        {!collapsed && (
          <span className="text-lg font-bold tracking-tight text-white">
            Operia
          </span>
        )}
      </SidebarHeader>

      <SidebarContent className="gap-1">
        {/* Accueil */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Accueil"
                  onClick={() => onViewChange('accueil')}
                  isActive={activeView === 'accueil'}
                  className={cn(
                    'font-semibold text-white/90 hover:bg-white/10 hover:text-white',
                    activeView === 'accueil' && 'bg-white/20 text-white',
                  )}
                >
                  <Home className="h-4 w-4" />
                  <span>Accueil</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="bg-white/10" />

        {/* Main sections: Pilotage & Suivi */}
        {SIDEBAR_SECTIONS.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel className="text-[11px] font-bold tracking-widest text-white/50 uppercase px-4 mb-1">
              {!collapsed && section.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.categories.map((cat) => {
                  const CatIcon = cat.icon;
                  const open = isInCategory(cat);

                  return (
                    <Collapsible key={cat.label} defaultOpen={open} className="group/collapsible">
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            tooltip={cat.label}
                            className="font-semibold text-white/90 hover:bg-white/10 hover:text-white"
                          >
                            <CatIcon className="h-4 w-4" />
                            <span>{cat.label}</span>
                            <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {cat.items.map((item) => {
                              const ItemIcon = item.icon;
                              const isActive = activeView === item.id;

                              return (
                                <SidebarMenuSubItem key={item.id}>
                                  <SidebarMenuSubButton
                                    onClick={() => onViewChange(item.id)}
                                    isActive={isActive}
                                    className={cn(
                                      'cursor-pointer text-white/70 hover:text-white hover:bg-white/10',
                                      isActive && 'bg-white/20 text-white font-medium',
                                    )}
                                  >
                                    <ItemIcon className="h-3.5 w-3.5" />
                                    <span>{item.label}</span>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              );
                            })}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        <SidebarSeparator className="bg-white/10" />

        {/* Support & Admin */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {showAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip="Administration"
                    onClick={() => onViewChange('admin')}
                    isActive={activeView === 'admin'}
                    className={cn(
                      'font-semibold text-white/90 hover:bg-white/10 hover:text-white',
                      activeView === 'admin' && 'bg-white/20 text-white',
                    )}
                  >
                    <Shield className="h-4 w-4" />
                    <span>Admin</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer: Profil */}
      <SidebarFooter className="border-t border-white/10">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  className="text-white/90 hover:bg-white/10 hover:text-white"
                  tooltip="Profil"
                >
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <User className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="flex flex-col text-left text-xs leading-tight">
                    <span className="font-semibold text-white truncate">
                      {user?.email?.split('@')[0] || 'Utilisateur'}
                    </span>
                    <span className="text-white/50 truncate text-[10px]">
                      {user?.email}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto h-4 w-4 text-white/50" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                    <User className="w-4 h-4" />
                    Mon profil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/agence" className="flex items-center gap-2 cursor-pointer">
                    <Building2 className="w-4 h-4" />
                    Mon agence
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="w-4 h-4" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
