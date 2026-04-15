/**
 * WorkspaceSidebar - Navigation latérale bleu/blanc
 * Sections : PILOTAGE et SUIVI CLIENT avec sous-catégories
 */
import { useCallback } from 'react';
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
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import {
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
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type SidebarView =
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
  | 'apporteurs-echanges';

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

/** Which section a view belongs to */
export function getSidebarSection(view: SidebarView): 'pilotage' | 'suivi' {
  if (view.startsWith('stats-') || view.startsWith('analytique-') || view.startsWith('operationnel-')) return 'pilotage';
  return 'suivi';
}

interface WorkspaceSidebarProps {
  activeView: SidebarView;
  onViewChange: (view: SidebarView) => void;
}

export function WorkspaceSidebar({ activeView, onViewChange }: WorkspaceSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

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
      <SidebarContent className="pt-4 gap-2">
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
      </SidebarContent>
    </Sidebar>
  );
}
