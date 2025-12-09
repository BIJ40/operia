/**
 * CommandPalette - Navigation rapide via ⌘K / Ctrl+K
 * 
 * Permet de naviguer rapidement vers n'importe quelle page accessible.
 * Filtré selon les rôles et modules de l'utilisateur.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { 
  GraduationCap, FileText, FolderOpen, Building2, Users, PieChart, 
  ListTodo, Tv, Calendar, Briefcase, Network, Coins, GitCompare,
  Headset, HelpCircle, FolderKanban, Kanban, Sparkles, Settings,
  Database, Activity, MessageCircle, Brain, Home, BarChart3
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleCapabilities } from '@/config/roleMatrix';
import { ROUTES } from '@/config/routes';
import { EXPERIMENTAL_HUB_ROUTE } from '@/config/experimentalNav';
import { GlobalRole, GLOBAL_ROLES } from '@/types/globalRoles';

interface CommandItem {
  id: string;
  title: string;
  keywords: string[];
  url: string;
  icon: React.ElementType;
  group: string;
  minRole?: GlobalRole;
  requiresModule?: string;
  requiresSupportConsole?: boolean;
}

// Définition des commandes disponibles
const COMMAND_ITEMS: CommandItem[] = [
  // Navigation principale
  { id: 'hub', title: 'Hub Central', keywords: ['accueil', 'home', 'hub'], url: EXPERIMENTAL_HUB_ROUTE, icon: Home, group: 'Navigation' },
  { id: 'dashboard', title: 'Dashboard', keywords: ['tableau de bord', 'stats'], url: '/', icon: BarChart3, group: 'Navigation' },
  
  // Academy
  { id: 'academy', title: 'Help! Academy', keywords: ['guide', 'formation'], url: ROUTES.academy.index, icon: GraduationCap, group: 'Academy', requiresModule: 'help_academy' },
  { id: 'apogee', title: 'Guide Apogée', keywords: ['apogee', 'logiciel'], url: ROUTES.academy.apogee, icon: GraduationCap, group: 'Academy', requiresModule: 'help_academy' },
  { id: 'apporteurs', title: 'Guide Apporteurs', keywords: ['apporteur', 'prescripteur'], url: ROUTES.academy.apporteurs, icon: FileText, group: 'Academy', requiresModule: 'help_academy' },
  { id: 'documents', title: 'Base Documentaire', keywords: ['document', 'fichier'], url: ROUTES.academy.documents, icon: FolderOpen, group: 'Academy', requiresModule: 'help_academy' },
  
  // Mon Agence
  { id: 'agence', title: 'Mon Agence', keywords: ['agence', 'pilotage'], url: ROUTES.pilotage.index, icon: Building2, group: 'Mon Agence', requiresModule: 'pilotage_agence' },
  { id: 'equipe', title: 'Mon équipe', keywords: ['equipe', 'collaborateur'], url: ROUTES.pilotage.equipe, icon: Users, group: 'Mon Agence', requiresModule: 'pilotage_agence' },
  { id: 'indicateurs', title: 'Mes Indicateurs', keywords: ['statistiques', 'kpi', 'indicateur'], url: ROUTES.pilotage.statsHub, icon: PieChart, group: 'Mon Agence', requiresModule: 'pilotage_agence' },
  { id: 'actions', title: 'Actions à Mener', keywords: ['action', 'tache', 'todo'], url: ROUTES.pilotage.actions, icon: ListTodo, group: 'Mon Agence', requiresModule: 'pilotage_agence' },
  { id: 'diffusion', title: 'Écran Diffusion', keywords: ['tv', 'affichage'], url: ROUTES.pilotage.diffusion, icon: Tv, group: 'Mon Agence', requiresModule: 'pilotage_agence' },
  { id: 'commercial', title: 'Commercial', keywords: ['vente', 'commercial'], url: ROUTES.pilotage.commercial, icon: Briefcase, group: 'Mon Agence', requiresModule: 'pilotage_agence' },
  { id: 'planning', title: 'Validation plannings', keywords: ['planning', 'calendrier'], url: ROUTES.pilotage.rhTech, icon: Calendar, group: 'Mon Agence', requiresModule: 'pilotage_agence' },
  
  // Réseau
  { id: 'reseau', title: 'Réseau Franchiseur', keywords: ['reseau', 'franchise'], url: ROUTES.reseau.index, icon: Network, group: 'Réseau', requiresModule: 'reseau_franchiseur' },
  { id: 'reseau-dashboard', title: 'Dashboard Réseau', keywords: ['reseau', 'dashboard'], url: ROUTES.reseau.dashboard, icon: Network, group: 'Réseau', requiresModule: 'reseau_franchiseur' },
  { id: 'agences', title: 'Agences du réseau', keywords: ['agence', 'liste'], url: ROUTES.reseau.agences, icon: Building2, group: 'Réseau', requiresModule: 'reseau_franchiseur' },
  { id: 'animateurs', title: 'Animateurs', keywords: ['animateur', 'responsable'], url: ROUTES.reseau.animateurs, icon: Users, group: 'Réseau', requiresModule: 'reseau_franchiseur', minRole: 'franchisor_admin' },
  { id: 'tableaux', title: 'Tableaux statistiques', keywords: ['tableau', 'stat'], url: ROUTES.reseau.tableaux, icon: PieChart, group: 'Réseau', requiresModule: 'reseau_franchiseur' },
  { id: 'periodes', title: 'Comparaison périodes', keywords: ['periode', 'comparaison'], url: ROUTES.reseau.periodes, icon: GitCompare, group: 'Réseau', requiresModule: 'reseau_franchiseur' },
  { id: 'redevances', title: 'Redevances', keywords: ['redevance', 'royalties'], url: ROUTES.reseau.redevances, icon: Coins, group: 'Réseau', requiresModule: 'reseau_franchiseur', minRole: 'franchisor_admin' },
  
  // Support
  { id: 'support', title: 'Support', keywords: ['aide', 'ticket', 'support'], url: ROUTES.support.index, icon: HelpCircle, group: 'Support' },
  { id: 'console', title: 'Console Support', keywords: ['console', 'agent'], url: ROUTES.support.console, icon: Headset, group: 'Support', requiresSupportConsole: true },
  
  // Projets
  { id: 'projects', title: 'Gestion de Projet', keywords: ['projet', 'ticket', 'dev'], url: ROUTES.projects.index, icon: FolderKanban, group: 'Projets', requiresModule: 'apogee_tickets' },
  { id: 'kanban', title: 'Kanban', keywords: ['kanban', 'board'], url: ROUTES.projects.kanban, icon: Kanban, group: 'Projets', requiresModule: 'apogee_tickets' },
  { id: 'auto-classify', title: 'Auto-Classeur IA', keywords: ['ia', 'classement', 'auto'], url: ROUTES.projects.autoClassify, icon: Sparkles, group: 'Projets', requiresModule: 'apogee_tickets' },
  
  // Admin
  { id: 'admin', title: 'Administration', keywords: ['admin', 'config'], url: ROUTES.admin.index, icon: Settings, group: 'Admin', minRole: 'platform_admin' },
  { id: 'admin-users', title: 'Gestion Utilisateurs', keywords: ['utilisateur', 'user'], url: ROUTES.admin.users, icon: Users, group: 'Admin', minRole: 'platform_admin' },
  { id: 'admin-agencies', title: 'Gestion Agences', keywords: ['agence'], url: ROUTES.admin.agencies, icon: Building2, group: 'Admin', minRole: 'platform_admin' },
  { id: 'admin-announcements', title: 'Annonces', keywords: ['annonce', 'notification'], url: ROUTES.admin.announcements, icon: MessageCircle, group: 'Admin', minRole: 'platform_admin' },
  { id: 'admin-faq', title: 'Admin FAQ', keywords: ['faq', 'question'], url: ROUTES.admin.faq, icon: HelpCircle, group: 'Admin', minRole: 'platform_admin' },
  { id: 'admin-helpi', title: 'Helpi IA', keywords: ['helpi', 'ia', 'rag'], url: ROUTES.admin.helpi, icon: Brain, group: 'Admin', minRole: 'platform_admin' },
  { id: 'admin-backup', title: 'Sauvegardes', keywords: ['backup', 'sauvegarde'], url: ROUTES.admin.backup, icon: Database, group: 'Admin', minRole: 'platform_admin' },
  { id: 'admin-activity', title: 'Activité utilisateurs', keywords: ['activite', 'log'], url: ROUTES.admin.userActivity, icon: Activity, group: 'Admin', minRole: 'platform_admin' },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { globalRole, hasModule, canAccessSupportConsoleUI } = useAuth();
  const caps = getRoleCapabilities(globalRole);

  // Écouter le raccourci clavier
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Filtrer les items selon les permissions
  const getFilteredItems = useCallback(() => {
    return COMMAND_ITEMS.filter(item => {
      // Vérifier le module
      if (item.requiresModule && !hasModule(item.requiresModule as any)) {
        return false;
      }
      
      // Vérifier l'accès support console
      if (item.requiresSupportConsole && !canAccessSupportConsoleUI) {
        return false;
      }
      
      // Vérifier le rôle minimum
      if (item.minRole) {
        const userLevel = globalRole ? GLOBAL_ROLES[globalRole] : 0;
        const requiredLevel = GLOBAL_ROLES[item.minRole];
        if (userLevel < requiredLevel) return false;
      }
      
      return true;
    });
  }, [globalRole, hasModule, canAccessSupportConsoleUI]);

  const filteredItems = getFilteredItems();

  // Grouper les items par groupe
  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  const handleSelect = (url: string) => {
    setOpen(false);
    navigate(url);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Rechercher une page..." />
      <CommandList>
        <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>
        
        {Object.entries(groupedItems).map(([group, items], index) => (
          <div key={group}>
            {index > 0 && <CommandSeparator />}
            <CommandGroup heading={group}>
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.id}
                    value={`${item.title} ${item.keywords.join(' ')}`}
                    onSelect={() => handleSelect(item.url)}
                    className="cursor-pointer"
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <span>{item.title}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}

/**
 * Bouton pour ouvrir la Command Palette
 */
export function CommandPaletteButton() {
  const [, setOpen] = useState(false);
  
  const handleClick = () => {
    // Simuler le raccourci clavier
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded-lg transition-colors"
    >
      <span>Rechercher...</span>
      <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
        <span className="text-xs">⌘</span>K
      </kbd>
    </button>
  );
}
