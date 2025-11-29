import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, User, Settings, Headset, Loader2, Menu, Pencil, FileEdit } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useSupportNotifications } from '@/hooks/use-support-notifications';
import { usePageMetadata, useUpsertPageMetadata } from '@/hooks/use-page-metadata';
import { GLOBAL_ROLES, GlobalRole } from '@/types/globalRoles';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { PAGE_TITLES } from '@/config/navigation';

// Configuration des pages avec leurs métadonnées
const PAGE_HEADER_CONFIG: {
  match: (path: string) => boolean;
  pageKey: string;
  defaultTitle: string;
}[] = [
  // Pilotage - Indicateurs
  { match: (path) => path === '/hc-agency/indicateurs' || path.startsWith('/hc-agency/indicateurs/'), pageKey: 'pilotage_indicateurs', defaultTitle: 'Indicateurs généraux' },
  { match: (path) => path === '/hc-agency/actions', pageKey: 'pilotage_actions', defaultTitle: 'Actions à Mener' },
  { match: (path) => path === '/hc-agency/diffusion', pageKey: 'pilotage_diffusion', defaultTitle: 'Mode Diffusion' },
  { match: (path) => path === '/hc-agency/rh-tech', pageKey: 'pilotage_rh_tech', defaultTitle: 'RH Tech' },
  { match: (path) => path === '/hc-agency/equipe', pageKey: 'pilotage_equipe', defaultTitle: 'Mon équipe' },
  { match: (path) => path === '/hc-agency', pageKey: 'pilotage_index', defaultTitle: 'Pilotage Agence' },
  
  // Help Academy
  { match: (path) => path.startsWith('/academy/apogee'), pageKey: 'academy_apogee', defaultTitle: 'Guide Apogée' },
  { match: (path) => path.startsWith('/academy/apporteurs'), pageKey: 'academy_apporteurs', defaultTitle: 'Guide Apporteurs' },
  { match: (path) => path.startsWith('/academy/hc-base'), pageKey: 'academy_documents', defaultTitle: 'Base Documentaire' },
  { match: (path) => path === '/academy', pageKey: 'academy_index', defaultTitle: 'Help! Academy' },
  
  // Support
  { match: (path) => path === '/support/mes-demandes', pageKey: 'support_mes_demandes', defaultTitle: 'Mes Demandes' },
  { match: (path) => path === '/support/console', pageKey: 'support_console', defaultTitle: 'Console Support' },
  { match: (path) => path === '/support', pageKey: 'support_index', defaultTitle: 'Support' },
  
  // Réseau Franchiseur
  { match: (path) => path === '/hc-reseau/dashboard', pageKey: 'reseau_dashboard', defaultTitle: 'Dashboard Réseau' },
  { match: (path) => path === '/hc-reseau/agences', pageKey: 'reseau_agences', defaultTitle: 'Agences du Réseau' },
  { match: (path) => path === '/hc-reseau/animateurs', pageKey: 'reseau_animateurs', defaultTitle: 'Gestion Animateurs' },
  { match: (path) => path === '/hc-reseau/stats', pageKey: 'reseau_stats', defaultTitle: 'Statistiques Réseau' },
  { match: (path) => path === '/hc-reseau/comparatifs', pageKey: 'reseau_comparatifs', defaultTitle: 'Comparatifs' },
  { match: (path) => path === '/hc-reseau/redevances', pageKey: 'reseau_redevances', defaultTitle: 'Redevances' },
  { match: (path) => path === '/hc-reseau', pageKey: 'reseau_index', defaultTitle: 'Réseau Franchiseur' },
  
  // Admin
  { match: (path) => path === '/admin/users', pageKey: 'admin_users', defaultTitle: 'Gestion Utilisateurs' },
  { match: (path) => path === '/admin/agencies', pageKey: 'admin_agencies', defaultTitle: 'Gestion Agences' },
  { match: (path) => path === '/admin/backup', pageKey: 'admin_backup', defaultTitle: 'Sauvegardes' },
  { match: (path) => path === '/admin/page-metadata', pageKey: 'admin_page_metadata', defaultTitle: 'Métadonnées des pages' },
  { match: (path) => path === '/admin', pageKey: 'admin_index', defaultTitle: 'Administration' },
  
  // Home
  { match: (path) => path === '/', pageKey: 'home', defaultTitle: 'Tableau de bord' },
];

// Obtenir la config de page pour un chemin donné
function getPageConfig(pathname: string) {
  return PAGE_HEADER_CONFIG.find(config => config.match(pathname)) || null;
}

// Vérifier si l'utilisateur peut éditer les métadonnées (N5/N6)
function canEditPageMetadata(globalRole: GlobalRole | null): boolean {
  if (!globalRole) return false;
  const level = GLOBAL_ROLES[globalRole];
  return level >= 5; // platform_admin (5) ou superadmin (6)
}

export function UnifiedHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, isSupport, isLoggingOut, logout, globalRole } = useAuth();
  const { toggleSidebar } = useSidebar();
  const { hasNewTickets, newTicketsCount } = useSupportNotifications();

  // Obtenir la configuration de la page actuelle
  const pageConfig = getPageConfig(location.pathname);
  const pageKey = pageConfig?.pageKey || '';
  const defaultTitle = pageConfig?.defaultTitle || PAGE_TITLES[location.pathname] || 'HC Services';
  
  // Charger les métadonnées de la page
  const { data: metadata } = usePageMetadata(pageKey);
  const upsertMutation = useUpsertPageMetadata();
  
  // Titre affiché (métadonnées ou défaut)
  const displayTitle = metadata?.header_title || defaultTitle;
  
  // État du dialog d'édition des métadonnées
  const [isMetadataDialogOpen, setIsMetadataDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editMenuLabel, setEditMenuLabel] = useState('');

  const canEdit = canEditPageMetadata(globalRole) && pageKey;

  const handleOpenMetadataDialog = () => {
    setEditTitle(metadata?.header_title || defaultTitle);
    setEditSubtitle(metadata?.header_subtitle || '');
    setEditMenuLabel(metadata?.menu_label || '');
    setIsMetadataDialogOpen(true);
  };

  const handleSaveMetadata = async () => {
    if (!pageKey) return;
    try {
      await upsertMutation.mutateAsync({
        page_key: pageKey,
        header_title: editTitle || null,
        header_subtitle: editSubtitle || null,
        menu_label: editMenuLabel || null,
      });
      toast.success('Métadonnées de page mises à jour');
      setIsMetadataDialogOpen(false);
    } catch (error) {
      console.error('Error updating page metadata:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  // Check if current page is editable (guides)
  const isEditablePage = location.pathname.startsWith('/academy/apogee') || 
                          location.pathname.startsWith('/academy/apporteurs') || 
                          location.pathname.startsWith('/academy/hc-base');

  // Toggle edit mode via URL param
  const handleToggleEditMode = () => {
    const params = new URLSearchParams(location.search);
    if (params.get('edit') === 'true') {
      params.delete('edit');
    } else {
      params.set('edit', 'true');
    }
    navigate(`${location.pathname}${params.toString() ? '?' + params.toString() : ''}`, { replace: true });
  };

  const isInEditMode = new URLSearchParams(location.search).get('edit') === 'true';

  return (
    <>
      {/* Logout overlay */}
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

      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 h-14">
        <div className="h-full px-4 flex items-center gap-4">
          {/* Sidebar toggle */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleSidebar}
            className="shrink-0"
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Zone centrale avec titre */}
          <div className="flex-1 flex items-center justify-center min-w-0">
            <h1 className="text-lg font-semibold text-foreground truncate">
              {displayTitle}
            </h1>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Metadata edit button for N5/N6 */}
            {canEdit && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost"
                      size="icon" 
                      onClick={handleOpenMetadataDialog}
                    >
                      <FileEdit className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Modifier les métadonnées de la page
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Edit mode button for admin on editable pages */}
            {isAdmin && isEditablePage && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant={isInEditMode ? "default" : "ghost"}
                      size="icon" 
                      onClick={handleToggleEditMode}
                      className={isInEditMode ? "bg-primary text-primary-foreground" : ""}
                    >
                      <Pencil className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isInEditMode ? "Désactiver le mode édition" : "Activer le mode édition"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Support button for support staff */}
            {(isSupport || isAdmin) && (
              <Link to="/admin/support">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`relative ${hasNewTickets ? 'text-destructive' : ''}`}
                >
                  <Headset className="w-5 h-5" />
                  {hasNewTickets && (
                    <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-bounce">
                      {newTicketsCount}
                    </span>
                  )}
                </Button>
              </Link>
            )}

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <User className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                    <User className="w-4 h-4" />
                    Mon profil
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin" className="flex items-center gap-2 cursor-pointer">
                      <Settings className="w-4 h-4" />
                      Administration
                    </Link>
                  </DropdownMenuItem>
                )}
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
      </header>

      {/* Dialog d'édition des métadonnées */}
      <Dialog open={isMetadataDialogOpen} onOpenChange={setIsMetadataDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier les métadonnées de la page</DialogTitle>
            <DialogDescription>
              Clé : <span className="font-mono text-primary">{pageKey}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="meta-title">Titre de la page</Label>
              <Input
                id="meta-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder={defaultTitle}
              />
              <p className="text-xs text-muted-foreground">
                Par défaut : {defaultTitle}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meta-subtitle">Description (sous-titre)</Label>
              <Textarea
                id="meta-subtitle"
                value={editSubtitle}
                onChange={(e) => setEditSubtitle(e.target.value)}
                placeholder="Description de la page..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meta-menu">Label menu (sidebar)</Label>
              <Input
                id="meta-menu"
                value={editMenuLabel}
                onChange={(e) => setEditMenuLabel(e.target.value)}
                placeholder="Texte dans la navigation"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMetadataDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveMetadata} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
