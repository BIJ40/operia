/**
 * UnifiedWorkspace - Interface unifiée sans header
 * Tous les modules accessibles via onglets sur une seule page
 * Onglets réorganisables via drag-and-drop (sauf Accueil)
 * 
 * Support URL: ?tab=XXX pour navigation directe vers un onglet
 */

import { lazy, Suspense, useMemo, useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Home, BarChart3, ClipboardList, 
  MoreHorizontal, Ticket, HelpCircle,
  Loader2, BookOpen, Shield, User, Building2, LogOut, Settings, Eye, FolderOpen, FlaskConical,
  Leaf, Droplets, Moon, Monitor, Palette
} from 'lucide-react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  horizontalListSortingStrategy 
} from '@dnd-kit/sortable';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList } from '@/components/ui/tabs';
import { useSessionState } from '@/hooks/useSessionState';
import { useAuth } from '@/contexts/AuthContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useEffectiveAuth } from '@/hooks/useEffectiveAuth';
import { useEffectiveModules } from '@/hooks/access-rights/useEffectiveModules';
import { useStorageQuota } from '@/hooks/use-storage-quota';
import { useUserPresence } from '@/hooks/use-user-presence';
import { useConnectionLogger } from '@/hooks/use-connection-logger';
import { LoginFormCard } from '@/components/LoginFormCard';
import { LoginDialog } from '@/components/LoginDialog';
import { ImageModal } from '@/components/ImageModal';
import { AiUnifiedProvider } from '@/components/ai';
import { DraggableTab } from '@/components/unified/DraggableTab';
import { SidebarChat } from '@/components/chat/SidebarChat';
// REMOVED: SimulationBanner, RoleSimulatorDropdown, RealUserImpersonationDialog - fonctionnalités supprimées
import { LocalErrorBoundary } from '@/components/system/LocalErrorBoundary';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ACCENT_THEMES, type AccentThemeKey } from '@/lib/accentThemes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { useAppTheme, type AppTheme } from '@/contexts/ThemeContext';

// Providers nécessaires
import { ApiToggleProvider } from '@/apogee-connect/contexts/ApiToggleContext';
import { AgencyProvider } from '@/apogee-connect/contexts/AgencyContext';
import { FiltersProvider } from '@/apogee-connect/contexts/FiltersContext';
import { SecondaryFiltersProvider } from '@/apogee-connect/contexts/SecondaryFiltersContext';
import { StatsHubProvider } from '@/apogee-connect/components/stats-hub/StatsHubContext';

// Lazy loaded tab contents
const DashboardContent = lazy(() => import('@/pages/DashboardStatic'));
const DemoAccueilContent = lazy(() => import('@/components/home/DemoAccueilContent').then(m => ({ default: m.DemoAccueilContent })));
const StatsTabContent = lazy(() => import('@/components/unified/tabs/StatsTabContent'));
const CollaborateursTabContent = lazy(() => import('@/components/unified/tabs/CollaborateursTabContent'));
const DiversTabContent = lazy(() => import('@/components/unified/tabs/DiversTabContent'));
const GuidesTabContent = lazy(() => import('@/components/unified/tabs/GuidesTabContent'));
const TicketingTabContent = lazy(() => import('@/components/unified/tabs/TicketingTabContent'));
const SupportTabContent = lazy(() => import('@/components/unified/tabs/SupportTabContent'));
const AdminTabContent = lazy(() => import('@/components/unified/tabs/AdminTabContent'));
const FranchiseurView = lazy(() => import('@/components/unified/views/FranchiseurView'));
const DocumentsTabContent = lazy(() => import('@/components/unified/tabs/DocumentsTabContent'));

type UnifiedTab = 
  | 'accueil' 
  | 'stats' 
  | 'salaries' 
  | 'outils' 
  | 'documents'
  | 'guides'
  | 'ticketing' 
  | 'aide'
  | 'admin'
  | 'test';

interface TabConfig {
  id: UnifiedTab;
  label: string;
  icon: React.ElementType;
  requiresOption?: { module: string; option?: string };
  altModules?: string[]; // Modules alternatifs qui rendent cet onglet visible
}

// Ordre par défaut des onglets (hors Accueil qui est toujours premier)
// Documents après Outils
const DEFAULT_TAB_ORDER: UnifiedTab[] = ['stats', 'salaries', 'outils', 'documents', 'guides', 'ticketing', 'aide', 'admin', 'test'];

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function UnifiedWorkspaceContent() {
  const { globalRole, isFranchiseur, logout, user, isLoggingOut } = useAuth();
  const { isImpersonating, isRealUserImpersonation } = useImpersonation();
  const effectiveAuth = useEffectiveAuth();
  const { hasModule, hasModuleOption } = useEffectiveModules();
  const { theme, setTheme } = useAppTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tabOrder, setTabOrder] = useSessionState<UnifiedTab[]>('unified_workspace_tab_order', DEFAULT_TAB_ORDER);
  const [loginOpen, setLoginOpen] = useState(false);
  // REMOVED: impersonationDialogOpen - fonctionnalité "Voir en tant que" désactivée
  
  // Support URL ?tab=XXX pour navigation directe
  const urlTab = searchParams.get('tab') as UnifiedTab | null;
  const [activeTab, setActiveTabState] = useSessionState<UnifiedTab>('unified_workspace_tab', urlTab || 'accueil');
  
  // Synchroniser l'URL quand l'onglet change
  const setActiveTab = useCallback((tab: UnifiedTab) => {
    setActiveTabState(tab);
    if (tab === 'accueil') {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ tab }, { replace: true });
    }
  }, [setActiveTabState, setSearchParams]);
  
  // Sync depuis URL au mount
  useEffect(() => {
    if (urlTab && urlTab !== activeTab) {
      setActiveTabState(urlTab);
    }
  }, [urlTab]);
  
  // Hooks for tracking
  useStorageQuota();
  useUserPresence();
  useConnectionLogger();
  
  // IMPERSONATION: Utiliser le rôle réel pour certaines permissions (bouton impersonation, etc.)
  // mais le rôle effectif pour l'affichage de l'interface
  const realIsPlatformAdmin = globalRole === 'superadmin' || globalRole === 'platform_admin';
  
  // Pour l'affichage des onglets, utiliser le rôle EFFECTIF (impersonné)
  const effectiveGlobalRole = effectiveAuth.globalRole;
  const effectiveIsPlatformAdmin = effectiveGlobalRole === 'superadmin' || effectiveGlobalRole === 'platform_admin';
  
  // Configuration des onglets avec permissions
  // Chaque onglet a un requiresOption qui définit le module/option nécessaire
  // La compat map dans useEffectiveModules gère automatiquement les clés legacy
  const allTabs: TabConfig[] = useMemo(() => [
    { id: 'accueil', label: 'Accueil', icon: Home },
    { id: 'stats', label: 'Stats', icon: BarChart3, requiresOption: { module: 'stats' } },
    { id: 'salaries', label: 'Salariés', icon: ClipboardList, requiresOption: { module: 'rh' } },
    { id: 'outils', label: 'Outils', icon: MoreHorizontal, requiresOption: { module: 'agence' }, altModules: ['prospection', 'parc', 'divers_apporteurs', 'divers_plannings', 'divers_reunions'] },
    { id: 'documents', label: 'Documents', icon: FolderOpen, requiresOption: { module: 'divers_documents' } },
    { id: 'guides', label: 'Guides', icon: BookOpen, requiresOption: { module: 'guides' } },
    { id: 'ticketing', label: 'Ticketing', icon: Ticket, requiresOption: { module: 'ticketing' } },
    { id: 'aide', label: 'Aide', icon: HelpCircle, requiresOption: { module: 'aide' } },
    { id: 'admin', label: 'Admin', icon: Shield, requiresOption: { module: 'admin_plateforme' } },
    ...(import.meta.env.DEV ? [{ id: 'test' as const, label: 'TEST', icon: FlaskConical }] : []),
  ], []);
  
  // Vérifier si un onglet est accessible pour l'utilisateur EFFECTIF (impersonné)
  // En mode impersonation, on montre ce que l'utilisateur impersonné verrait
  const isTabAccessibleForEffectiveUser = useCallback((tab: TabConfig): boolean => {
    if (!tab.requiresOption) return true;
    // Utiliser les modules EFFECTIFS (de l'utilisateur impersonné)
    if (effectiveIsPlatformAdmin) return true;
    
    const { module, option } = tab.requiresOption;
    if (option) {
      if (hasModuleOption(module as any, option)) return true;
    } else {
      if (hasModule(module as any)) return true;
    }
    
    // Vérifier les modules alternatifs
    if (tab.altModules) {
      for (const altModule of tab.altModules) {
        if (hasModule(altModule as any)) return true;
      }
    }
    
    return false;
  }, [effectiveIsPlatformAdmin, hasModule, hasModuleOption]);
  
  // L'admin réel peut toujours cliquer sur les onglets (pour naviguer)
  // mais on affiche visuellement l'état "désactivé" selon l'utilisateur impersonné
  const isTabAccessible = useCallback((tab: TabConfig): boolean => {
    if (!tab.requiresOption) return true;
    // L'admin réel peut toujours naviguer (même pour voir un onglet vide)
    if (realIsPlatformAdmin) return true;
    return isTabAccessibleForEffectiveUser(tab);
  }, [realIsPlatformAdmin, isTabAccessibleForEffectiveUser]);
  
  // Vérifier si un onglet doit être complètement masqué (pas juste désactivé)
  // Utilise le rôle EFFECTIF pour l'affichage
  const isTabHidden = useCallback((tab: TabConfig): boolean => {
    // Admin n'est visible QUE pour les vrais admins plateforme (pas impersonable)
    if (tab.id === 'admin' && !realIsPlatformAdmin) {
      return true;
    }
    return false;
  }, [realIsPlatformAdmin]);
  
  // Détermine si un onglet doit apparaître comme désactivé visuellement
  // En mode impersonation, on montre les onglets inaccessibles comme grisés
  const isTabVisuallyDisabled = useCallback((tab: TabConfig): boolean => {
    if (isRealUserImpersonation) {
      return !isTabAccessibleForEffectiveUser(tab);
    }
    return !isTabAccessible(tab);
  }, [isRealUserImpersonation, isTabAccessibleForEffectiveUser, isTabAccessible]);
  
  // Filtrer les onglets masqués (Admin pour non-admins)
  const visibleTabs = useMemo(() => allTabs.filter(tab => !isTabHidden(tab)), [allTabs, isTabHidden]);

  // Auto-réparer un ordre stocké obsolète (ex: un onglet ajouté/renommé n'est pas présent)
  // => sinon l'onglet peut sembler "non déplaçable" car absent de tabOrder.
  useEffect(() => {
    const visibleIds = visibleTabs.filter(t => t.id !== 'accueil').map(t => t.id);
    const cleaned = tabOrder.filter(id => visibleIds.includes(id));

    const defaultVisible = DEFAULT_TAB_ORDER.filter(id => visibleIds.includes(id));
    const missingFromDefault = defaultVisible.filter(id => !cleaned.includes(id));
    const extraMissing = visibleIds.filter(id => !cleaned.includes(id) && !defaultVisible.includes(id));

    const next = [...cleaned, ...missingFromDefault, ...extraMissing];
    const isSame = next.length === tabOrder.length && next.every((v, i) => v === tabOrder[i]);
    if (!isSame) setTabOrder(next);
  }, [visibleTabs, tabOrder, setTabOrder]);
  
  // Onglets triés selon l'ordre personnalisé (Accueil toujours premier)
  const sortedTabs = useMemo(() => {
    const accueilTab = visibleTabs.find(t => t.id === 'accueil')!;
    const otherTabs = visibleTabs.filter(t => t.id !== 'accueil');
    
    // Trier selon tabOrder, en gardant les onglets non présents dans l'ordre à la fin
    const sorted = [...otherTabs].sort((a, b) => {
      const indexA = tabOrder.indexOf(a.id);
      const indexB = tabOrder.indexOf(b.id);
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
    
    return [accueilTab, ...sorted];
  }, [visibleTabs, tabOrder]);

  // IDs pour le sortable context (exclure accueil)
  const sortableIds = useMemo(
    () => sortedTabs.filter(t => t.id !== 'accueil').map(t => t.id),
    [sortedTabs]
  );
  
  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum distance before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    // Ne pas permettre de déplacer Accueil
    if (active.id === 'accueil' || over.id === 'accueil') return;

    // IMPORTANT: se baser sur l'ordre effectivement affiché (sortableIds),
    // pas sur tabOrder (qui peut être incomplet/obsolète).
    const oldIndex = sortableIds.indexOf(active.id as UnifiedTab);
    const newIndex = sortableIds.indexOf(over.id as UnifiedTab);

    if (oldIndex !== -1 && newIndex !== -1) {
      setTabOrder(arrayMove(sortableIds, oldIndex, newIndex) as UnifiedTab[]);
    }
  }, [sortableIds, setTabOrder]);
  
  // Déterminer si l'utilisateur EFFECTIF est N0 (base_user ou null)
  // En mode impersonation, utiliser le rôle de l'utilisateur impersonné
  const effectiveIsN0User = !effectiveGlobalRole || effectiveGlobalRole === 'base_user';
  
  // Pour Hugo Bulthé (base_user sans agence), on doit afficher le DemoAccueilContent
  // car il n'a pas accès aux données réelles d'agence
  const isN0User = effectiveIsN0User;
  
  // Trouver le premier onglet accessible (priorité à Ticketing pour N0)
  const getDefaultTabForN0 = useCallback((): UnifiedTab => {
    // Priorité 1: Ticketing si accessible
    const ticketingTab = allTabs.find(t => t.id === 'ticketing');
    if (ticketingTab && isTabAccessible(ticketingTab)) {
      return 'ticketing';
    }
    // Priorité 2: Premier onglet accessible (autre que accueil)
    const firstAccessible = allTabs.find(t => t.id !== 'accueil' && isTabAccessible(t));
    if (firstAccessible) {
      return firstAccessible.id as UnifiedTab;
    }
    // Fallback: Accueil
    return 'accueil';
  }, [allTabs, isTabAccessible]);
  
  // Si l'onglet actif n'est pas accessible, rediriger
  const activeTabConfig = sortedTabs.find(t => t.id === activeTab);
  const isActiveTabAccessible = activeTabConfig && isTabAccessible(activeTabConfig);
  
  // Pour onglet inaccessible, rediriger vers accueil
  const validActiveTab = useMemo(() => {
    if (!isActiveTabAccessible) {
      return 'accueil';
    }
    return activeTab;
  }, [activeTab, isActiveTabAccessible]);
  
  // Synchroniser l'URL si redirection automatique (N0 vers Ticketing)
  useEffect(() => {
    if (validActiveTab !== activeTab) {
      setActiveTab(validActiveTab);
    }
  }, [validActiveTab, activeTab, setActiveTab]);
  
  // Mettre à jour le titre de la page selon l'onglet actif
  useEffect(() => {
    const activeTabConfig = sortedTabs.find(t => t.id === validActiveTab);
    const tabLabel = activeTabConfig?.label || 'Accueil';
    document.title = `${tabLabel} - HelpConfort`;
  }, [validActiveTab, sortedTabs]);
  
  const tabButtonClass = `
    relative px-4 py-3 rounded-t-xl border-2 border-b-0 transition-all duration-300 whitespace-nowrap shrink-0 min-w-0
    data-[state=inactive]:bg-muted/40 data-[state=inactive]:border-border/50 data-[state=inactive]:text-muted-foreground 
    data-[state=inactive]:hover:bg-primary/10 data-[state=inactive]:hover:border-primary/40
    data-[state=inactive]:hover:scale-105 data-[state=inactive]:hover:-translate-y-0.5 data-[state=inactive]:hover:shadow-md
    data-[state=active]:bg-background data-[state=active]:border-primary/50
    data-[state=active]:z-20 data-[state=active]:-mb-[2px] data-[state=active]:pb-[calc(0.75rem+2px)] data-[state=active]:scale-[1.02]
  `;
  
  // Calculer le padding top selon les bandeaux actifs
  const topPadding = (isImpersonating || isRealUserImpersonation) ? 'pt-10' : '';
  
  // Vue Franchiseur = interface complètement différente pour N3+
  // IMPORTANT: un admin plateforme RÉEL doit pouvoir revenir à la vue normale.
  if (isFranchiseur && !realIsPlatformAdmin) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <FranchiseurView />
      </Suspense>
    );
  }

  // Couleurs distinctes pour chaque onglet (aucune répétition)
  const unifiedTabAccent: Record<UnifiedTab, AccentThemeKey> = {
    accueil: 'blue',
    stats: 'pink',
    salaries: 'green',
    outils: 'purple',
    documents: 'red',
    guides: 'teal',
    
    ticketing: 'orange',
    aide: 'cyan',
    admin: 'neutral',
    test: 'teal',
  };
  
  return (
    <AiUnifiedProvider>
      <TooltipProvider delayDuration={0}>

        {/* Overlay de déconnexion (cohérence avec le reste de l'app) */}
        {isLoggingOut && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center animate-fade-in">
            <div className="bg-card border-2 border-primary/20 rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <div className="text-center">
                <h3 className="text-xl font-bold text-foreground mb-2">Déconnexion en cours...</h3>
                <p className="text-sm text-muted-foreground">À bientôt !</p>
              </div>
            </div>
          </div>
        )}
        
        <div className={`min-h-screen bg-background ${topPadding}`}>
          <Tabs value={validActiveTab} onValueChange={(v) => setActiveTab(v as UnifiedTab)} className="flex flex-col h-screen">
            {/* Tab bar fixe en haut */}
            <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm print:hidden">
              <div className="container mx-auto max-w-7xl px-4 pt-3 pb-0">
                <div className="flex items-end justify-between gap-4">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <TabsList className="h-auto p-0 bg-transparent flex flex-nowrap gap-1 items-end justify-start flex-1 overflow-x-auto scrollbar-hide">
                      {/* Onglet Accueil - non draggable */}
                      {sortedTabs[0] && (
                        <button
                          onClick={() => setActiveTab('accueil')}
                          data-state={validActiveTab === 'accueil' ? 'active' : 'inactive'}
                          className={tabButtonClass}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-helpconfort-blue to-helpconfort-blue/70 flex items-center justify-center shadow-sm transition-transform group-hover:scale-110 shrink-0">
                              <Home className="w-3.5 h-3.5 text-white" />
                            </div>
                            <span className="text-sm font-semibold tracking-tight">Accueil</span>
                          </div>
                        </button>
                      )}
                      
                      {/* Onglets sortables */}
                      <SortableContext items={sortableIds} strategy={horizontalListSortingStrategy}>
                        {sortedTabs.slice(1).map((tab) => {
                          const Icon = tab.icon;
                          const accent = ACCENT_THEMES[unifiedTabAccent[tab.id]];
                          const isAccessible = isTabAccessible(tab);
                          const isVisuallyDisabled = isTabVisuallyDisabled(tab);
                          return (
                            <DraggableTab
                              key={tab.id}
                              id={tab.id}
                              isActive={validActiveTab === tab.id}
                              isDraggable={isAccessible}
                              isDisabled={isVisuallyDisabled}
                              onClick={() => isAccessible ? setActiveTab(tab.id) : undefined}
                              className={tabButtonClass}
                            >
                              <div className={`flex items-center gap-2 ${isVisuallyDisabled ? 'opacity-40' : ''}`}>
                                 <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${accent.gradient} flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-110 shrink-0`}>
                                   <Icon className="w-3.5 h-3.5 text-primary-foreground" />
                                </div>
                                <span className="text-sm font-semibold tracking-tight">{tab.label}</span>
                              </div>
                            </DraggableTab>
                          );
                        })}
                      </SortableContext>
                    </TabsList>
                  </DndContext>

                  {/* Onglet “leurre” Profil (menu déroulant) — toujours visible */}
                  <div className="flex items-end gap-2 shrink-0">
                    <div className="h-6 w-px bg-border/50 mb-2" />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className={tabButtonClass}
                          data-state="inactive"
                          aria-label="Profil"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shadow-sm transition-transform group-hover:scale-110 shrink-0">
                              <User className="w-3.5 h-3.5 text-foreground" />
                            </div>
                            <span className="text-sm font-semibold tracking-tight">Profil</span>
                          </div>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 bg-popover z-50">
                        <div className="px-3 py-2">
                          <p className="font-medium text-sm">{user?.email?.split('@')[0] || 'Utilisateur'}</p>
                          <p className="text-xs text-muted-foreground">{user?.email}</p>
                        </div>
                        <DropdownMenuSeparator />
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
                        <DropdownMenuItem asChild>
                          <Link to="/changelog" className="flex items-center gap-2 cursor-pointer">
                            <Settings className="w-4 h-4" />
                            Changelog
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="flex items-center gap-2 cursor-pointer">
                            <Palette className="w-4 h-4" />
                            Apparence
                          </DropdownMenuSubTrigger>
                          <DropdownMenuPortal>
                            <DropdownMenuSubContent className="w-48">
                              {([
                                { key: 'default' as AppTheme, label: 'Classique', icon: Monitor },
                                { key: 'zen-nature' as AppTheme, label: 'Zen Nature', icon: Leaf },
                                { key: 'zen-blue' as AppTheme, label: 'Zen Bleu', icon: Droplets },
                                { key: 'sombre' as AppTheme, label: 'Sombre', icon: Moon },
                              ]).map(opt => (
                                <DropdownMenuItem
                                  key={opt.key}
                                  onClick={() => setTheme(opt.key)}
                                  className="flex items-center gap-2 cursor-pointer"
                                >
                                  <opt.icon className="w-4 h-4" />
                                  {opt.label}
                                  {theme === opt.key && <span className="ml-auto w-2 h-2 rounded-full bg-primary" />}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuPortal>
                        </DropdownMenuSub>
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
                    
                  </div>
                </div>
              </div>
              {/* Ligne de bordure qui se connecte aux onglets */}
              <div className="container mx-auto max-w-7xl px-4">
                <div className="border-t-2 border-primary/50 bg-background"></div>
              </div>
            </div>
            
            {/* Contenu des onglets */}
             <main id="main-content" className="flex-1 overflow-auto" role="main">
              <Suspense fallback={<LoadingFallback />}>
              <TabsContent value="accueil" className="mt-0 h-full">
                  {isN0User ? <DemoAccueilContent /> : <DashboardContent />}
                </TabsContent>
                
                <TabsContent value="stats" className="mt-0">
                  <LocalErrorBoundary componentName="Statistiques">
                    <StatsHubProvider>
                      <StatsTabContent />
                    </StatsHubProvider>
                  </LocalErrorBoundary>
                </TabsContent>
                
                <TabsContent value="salaries" className="mt-0">
                  <LocalErrorBoundary componentName="Collaborateurs">
                    <CollaborateursTabContent />
                  </LocalErrorBoundary>
                </TabsContent>
                
                <TabsContent value="outils" className="mt-0">
                  <LocalErrorBoundary componentName="Outils">
                    <DiversTabContent />
                  </LocalErrorBoundary>
                </TabsContent>
                
                <TabsContent value="documents" className="mt-0">
                  <LocalErrorBoundary componentName="Documents">
                    <DocumentsTabContent />
                  </LocalErrorBoundary>
                </TabsContent>
                
                <TabsContent value="guides" className="mt-0">
                  <LocalErrorBoundary componentName="Guides">
                    <GuidesTabContent />
                  </LocalErrorBoundary>
                </TabsContent>
                
                <TabsContent value="ticketing" className="mt-0">
                  <LocalErrorBoundary componentName="Ticketing">
                    <TicketingTabContent />
                  </LocalErrorBoundary>
                </TabsContent>
                
                <TabsContent value="aide" className="mt-0">
                  <LocalErrorBoundary componentName="Support">
                    <SupportTabContent />
                  </LocalErrorBoundary>
                </TabsContent>
                
                <TabsContent value="admin" className="mt-0">
                  <LocalErrorBoundary componentName="Administration">
                    <AdminTabContent />
                  </LocalErrorBoundary>
                </TabsContent>
                
                <TabsContent value="test" className="mt-0">
                  <div className="p-8 text-center space-y-4">
                    <FlaskConical className="w-12 h-12 mx-auto text-muted-foreground" />
                    <h2 className="text-xl font-semibold text-foreground">Onglet TEST</h2>
                    <p className="text-muted-foreground">Cet onglet est réservé aux tests.</p>
                  </div>
                </TabsContent>
                
              </Suspense>
            </main>
          </Tabs>
        </div>
        
        <ImageModal />
        <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
        <SidebarChat />
      </TooltipProvider>
    </AiUnifiedProvider>
  );
}

function UnifiedWorkspaceAuth() {
  const { isAuthenticated, isAuthLoading } = useAuth();
  
  // Show loading state while auth is initializing
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show login form for unauthenticated users
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950/10 via-background to-indigo-950/10 p-4">
        <LoginFormCard />
      </div>
    );
  }
  
  return <UnifiedWorkspaceContent />;
}

export default function UnifiedWorkspace() {
  return (
    <ApiToggleProvider>
      <AgencyProvider>
        <FiltersProvider>
          <SecondaryFiltersProvider>
            <UnifiedWorkspaceAuth />
          </SecondaryFiltersProvider>
        </FiltersProvider>
      </AgencyProvider>
    </ApiToggleProvider>
  );
}
