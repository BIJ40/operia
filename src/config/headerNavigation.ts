import {
  BarChart3, Activity, ListChecks, FileCheck, AlertTriangle,
  ShoppingCart, Users as UsersIcon, Search, Eye, TrendingUp,
  Users, Car, Handshake, CalendarDays, MessagesSquare,
  FolderOpen, Headphones, HelpCircle, Kanban, Shield, Building2,
  type LucideIcon,
} from 'lucide-react';
import type { UnifiedTab } from '@/components/unified/workspace/types';

export interface HeaderNavChild {
  label: string;
  tab?: UnifiedTab;
  subView?: string;
  /** SessionStorage key + value to set when selecting (for sub-tab routing) */
  subTabKey?: string;
  subTabValue?: string;
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
  /** Accent color for this domain */
  accent?: 'blue' | 'orange' | 'green' | 'purple' | 'pink' | 'teal' | 'red';
  children: HeaderNavChild[];
}

export const HEADER_NAV_GROUPS: HeaderNavGroup[] = [
  {
    label: 'Pilotage',
    icon: BarChart3,
    tab: 'pilotage',
    accent: 'blue',
    children: [
      { label: 'Statistiques', icon: BarChart3, tab: 'pilotage', description: 'Tableaux de bord et KPIs', scope: 'pilotage.statistiques', subTabKey: 'pilotage_sub_tab', subTabValue: 'stats' },
      { label: 'Performance', icon: Activity, tab: 'pilotage', description: 'Indicateurs de performance', scope: 'pilotage.performance', subTabKey: 'pilotage_sub_tab', subTabValue: 'performance' },
      { label: 'Actions à mener', icon: ListChecks, tab: 'pilotage', description: 'Suivi des actions', scope: 'pilotage.actions_a_mener', subTabKey: 'pilotage_sub_tab', subTabValue: 'actions' },
      { label: 'Devis acceptés', icon: FileCheck, tab: 'pilotage', description: 'Suivi des devis signés', scope: 'pilotage.devis_acceptes', subTabKey: 'pilotage_sub_tab', subTabValue: 'devis-acceptes' },
      { label: 'Incohérences', icon: AlertTriangle, tab: 'pilotage', description: 'Alertes et anomalies', scope: 'pilotage.incoherences', subTabKey: 'pilotage_sub_tab', subTabValue: 'anomalies' },
      { label: 'Résultat', icon: TrendingUp, tab: 'pilotage', description: 'Performance financière', scope: 'pilotage.resultat', subTabKey: 'pilotage_sub_tab', subTabValue: 'resultat' },
      { label: 'Rentabilité', icon: TrendingUp, tab: 'pilotage', description: 'Rentabilité dossier', scope: 'pilotage.rentabilite', subTabKey: 'pilotage_sub_tab', subTabValue: 'rentabilite' },
    ],
  },
  {
    label: 'Commercial',
    icon: ShoppingCart,
    tab: 'commercial',
    accent: 'orange',
    children: [
      { label: 'Suivi client', icon: UsersIcon, tab: 'commercial', description: 'Gestion des apporteurs', scope: 'commercial.suivi_client', subTabKey: 'commercial_sub_tab', subTabValue: 'apporteurs' },
      { label: 'Comparateur', icon: Search, tab: 'commercial', description: 'Benchmark et comparaison', scope: 'commercial.comparateur', subTabKey: 'commercial_sub_tab', subTabValue: 'comparateur' },
      { label: 'Veille', icon: Eye, tab: 'commercial', description: 'Veille concurrentielle', scope: 'commercial.veille', subTabKey: 'commercial_sub_tab', subTabValue: 'veille' },
      { label: 'Prospects', icon: ShoppingCart, tab: 'commercial', description: 'Suivi des prospects', scope: 'commercial.prospects', subTabKey: 'commercial_sub_tab', subTabValue: 'prospects' },
      { label: 'Réalisations', icon: TrendingUp, tab: 'commercial', description: 'Chiffres et bilans', scope: 'commercial.realisations', subTabKey: 'commercial_sub_tab', subTabValue: 'realisations' },
      { label: 'Social', icon: Share2, tab: 'commercial', description: 'Réseaux sociaux', scope: 'commercial.social', subTabKey: 'commercial_sub_tab', subTabValue: 'social' },
      { label: 'Signatures', icon: Stamp, tab: 'commercial', description: 'Signatures email', scope: 'commercial.signature', subTabKey: 'commercial_sub_tab', subTabValue: 'signature' },
    ],
  },
  {
    label: 'Organisation',
    icon: Users,
    tab: 'organisation',
    accent: 'green',
    children: [
      { label: 'Salariés', icon: Users, tab: 'organisation', description: 'Gestion des équipes', scope: 'organisation.salaries', subTabKey: 'organisation_sub_tab', subTabValue: 'collaborateurs' },
      { label: 'Véhicules', icon: Car, tab: 'organisation', description: 'Parc automobile', scope: 'organisation.parc', subTabKey: 'organisation_sub_tab', subTabValue: 'parc' },
      { label: 'Apporteurs', icon: Handshake, tab: 'organisation', description: "Réseau d'apporteurs", scope: 'organisation.apporteurs', subTabKey: 'organisation_sub_tab', subTabValue: 'apporteurs' },
      { label: 'Plannings', icon: CalendarDays, tab: 'organisation', description: 'Calendrier équipe', scope: 'organisation.plannings', subTabKey: 'organisation_sub_tab', subTabValue: 'plannings' },
      { label: 'Réunions', icon: MessagesSquare, tab: 'organisation', description: 'Comptes rendus', scope: 'organisation.reunions', subTabKey: 'organisation_sub_tab', subTabValue: 'reunions' },
      { label: 'Documents légaux', icon: FolderOpen, tab: 'organisation', description: 'Kbis, RC Pro…', subTabKey: 'organisation_sub_tab', subTabValue: 'conformite' },
    ],
  },
  {
    label: 'Documents',
    icon: FolderOpen,
    tab: 'documents',
    accent: 'teal',
    children: [
      { label: 'Médiathèque', icon: FolderOpen, tab: 'documents', description: 'Fichiers et ressources', scope: 'mediatheque.documents' },
    ],
  },
  {
    label: 'Support',
    icon: Headphones,
    tab: 'support',
    accent: 'purple',
    children: [
      { label: 'Aide', icon: HelpCircle, tab: 'support', description: 'Centre d\'aide' },
      { label: 'Ticketing', icon: Kanban, tab: 'ticketing', description: 'Suivi des tickets', scope: 'ticketing' },
    ],
  },
  {
    label: 'Admin',
    icon: Shield,
    tab: 'admin',
    accent: 'red',
    children: [
      { label: 'Utilisateurs', icon: UsersIcon, tab: 'admin', description: 'Gestion des comptes', scope: 'admin_plateforme', subTabKey: 'admin_main_tab', subTabValue: 'gestion' },
      { label: 'Agences', icon: Building2, tab: 'admin', description: 'Réseau d\'agences', scope: 'admin_plateforme', subTabKey: 'admin_main_tab', subTabValue: 'gestion' },
      { label: 'Droits', icon: Shield, tab: 'admin', description: 'Permissions et modules', scope: 'admin_plateforme', subTabKey: 'admin_main_tab', subTabValue: 'gestion' },
    ],
  },
];
