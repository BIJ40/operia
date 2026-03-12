import {
  BarChart3, Building2, ShoppingCart, TrendingUp,
  Users, Car, Handshake, CalendarDays, MessagesSquare,
  FolderOpen, Headphones, HelpCircle, Kanban, Shield,
  type LucideIcon,
} from 'lucide-react';
import type { UnifiedTab } from '@/components/unified/workspace/types';

export interface HeaderNavChild {
  label: string;
  tab?: UnifiedTab;
  subView?: string;
  path?: string;
  icon: LucideIcon;
  description?: string;
  badge?: string;
  /** Module key needed to show this child */
  scope?: string;
}

export interface HeaderNavGroup {
  label: string;
  icon: LucideIcon;
  /** Main tab this group maps to (for active state) */
  tab: UnifiedTab;
  children: HeaderNavChild[];
}

export const HEADER_NAV_GROUPS: HeaderNavGroup[] = [
  {
    label: 'Pilotage',
    icon: BarChart3,
    tab: 'pilotage',
    children: [
      { label: 'Statistiques', icon: BarChart3, tab: 'pilotage', subView: 'statistiques', description: 'Tableaux de bord et KPIs', scope: 'pilotage.statistiques' },
      { label: 'Mon Agence', icon: Building2, tab: 'pilotage', subView: 'agence', description: 'Informations agence', scope: 'pilotage.agence' },
    ],
  },
  {
    label: 'Commercial',
    icon: ShoppingCart,
    tab: 'commercial',
    children: [
      { label: 'Prospection', icon: ShoppingCart, tab: 'commercial', subView: 'prospection', description: 'Suivi des prospects', scope: 'prospection' },
      { label: 'Réalisations', icon: TrendingUp, tab: 'commercial', subView: 'realisations', description: 'Chiffres et bilans', scope: 'commercial.realisations' },
    ],
  },
  {
    label: 'Organisation',
    icon: Users,
    tab: 'organisation',
    children: [
      { label: 'Salariés', icon: Users, tab: 'organisation', subView: 'salaries', description: 'Gestion des équipes', scope: 'organisation.salaries' },
      { label: 'Véhicules', icon: Car, tab: 'organisation', subView: 'parc', description: 'Parc automobile', scope: 'organisation.parc' },
      { label: 'Apporteurs', icon: Handshake, tab: 'organisation', subView: 'apporteurs', description: "Réseau d'apporteurs", scope: 'organisation.apporteurs' },
      { label: 'Plannings', icon: CalendarDays, tab: 'organisation', subView: 'plannings', description: 'Calendrier équipe', scope: 'organisation.plannings' },
      { label: 'Réunions', icon: MessagesSquare, tab: 'organisation', subView: 'reunions', description: 'Comptes rendus', scope: 'organisation.reunions' },
    ],
  },
  {
    label: 'Documents',
    icon: FolderOpen,
    tab: 'documents',
    children: [
      { label: 'Médiathèque', icon: FolderOpen, tab: 'documents', description: 'Fichiers et ressources', scope: 'mediatheque.documents' },
    ],
  },
  {
    label: 'Support',
    icon: Headphones,
    tab: 'support',
    children: [
      { label: 'Aide', icon: HelpCircle, tab: 'support', description: 'Centre d\'aide' },
      { label: 'Ticketing', icon: Kanban, tab: 'ticketing', description: 'Suivi des tickets', scope: 'ticketing' },
    ],
  },
  {
    label: 'Admin',
    icon: Shield,
    tab: 'admin',
    children: [
      { label: 'Administration', icon: Shield, tab: 'admin', description: 'Paramètres plateforme', scope: 'admin_plateforme' },
    ],
  },
];
