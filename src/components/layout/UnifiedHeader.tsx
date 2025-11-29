import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LogOut, User, Settings, Headset, Loader2, Menu, Pencil, FileEdit, ArrowLeft,
  BarChart3, CheckSquare, Tv, CalendarDays, Users, Gauge,
  BookOpen, Handshake, FolderOpen, GraduationCap,
  MessageSquare, LifeBuoy,
  LayoutDashboard, Building2, UserCog, PieChart, GitCompare, Calculator, Network,
  Building, Database, FileText, Home,
  LucideIcon
} from 'lucide-react';
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
import { getPageConfigByPath, getPageDefaultByKey } from '@/config/pageDefaults';

// Mapping des noms d'icônes vers les composants
const ICON_MAP: Record<string, LucideIcon> = {
  BarChart3, CheckSquare, Tv, CalendarDays, Users, Gauge,
  BookOpen, Handshake, FolderOpen, GraduationCap,
  MessageSquare, LifeBuoy, Headset,
  LayoutDashboard, Building2, UserCog, PieChart, GitCompare, Calculator, Network,
  Building, Database, FileText, Home, Settings,
};

// Vérifier si l'utilisateur peut éditer les métadonnées (N5/N6)
function canEditPageMetadata(globalRole: GlobalRole | null): boolean {
  if (!globalRole) return false;
  const level = GLOBAL_ROLES[globalRole];
  return level >= 5; // platform_admin (5) ou superadmin (6)
}

// Helper pour styliser "Help!" avec le "!" en orange
function formatHelpTitle(title: string): React.ReactNode {
  if (title.includes('Help!')) {
    const parts = title.split('Help!');
    return (
      <>
        {parts[0]}Help<span className="text-helpconfort-orange">!</span>{parts[1]}
      </>
    );
  }
  return title;
}

export function UnifiedHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, isSupport, isLoggingOut, logout, globalRole } = useAuth();
  const { toggleSidebar } = useSidebar();
  const { hasNewTickets, newTicketsCount } = useSupportNotifications();

  // Obtenir la configuration de la page actuelle
  const pageConfig = getPageConfigByPath(location.pathname);
  const pageKey = pageConfig?.pageKey || '';
  const defaultTitle = pageConfig?.defaultTitle || PAGE_TITLES[location.pathname] || 'HC Services';
  const defaultSubtitle = pageConfig?.defaultSubtitle || '';
  
  // Charger les métadonnées de la page
  const { data: metadata } = usePageMetadata(pageKey);
  const upsertMutation = useUpsertPageMetadata();
  
  // Titre et sous-titre affichés (métadonnées ou défaut)
  const displayTitle = metadata?.header_title || defaultTitle;
  const displaySubtitle = metadata?.header_subtitle || defaultSubtitle;
  
  // Icône de la page (depuis config)
  const iconName = pageConfig?.icon;
  const PageIcon = iconName ? ICON_MAP[iconName] : null;
  
  // Navigation parente (retour)
  const parentRoute = pageConfig?.parentRoute;
  const parentLabel = pageConfig?.parentLabel;
  const showBackButton = !!parentRoute && location.pathname !== '/';
  
  // État du dialog d'édition des métadonnées
  const [isMetadataDialogOpen, setIsMetadataDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editMenuLabel, setEditMenuLabel] = useState('');
  const [editTitleSize, setEditTitleSize] = useState('3xl');
  const [editIconSize, setEditIconSize] = useState('3xl');
  const [editIconColor, setEditIconColor] = useState('');
  const [editSubtitleBgColor, setEditSubtitleBgColor] = useState('');
  const [editSubtitleTextSize, setEditSubtitleTextSize] = useState('xs');

  // Size mappings
  const TITLE_SIZES: Record<string, string> = {
    'sm': 'text-sm',
    'base': 'text-base',
    'lg': 'text-lg',
    'xl': 'text-xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl',
    '4xl': 'text-4xl',
  };
  const ICON_SIZES: Record<string, string> = {
    'sm': 'w-4 h-4',
    'md': 'w-5 h-5',
    'lg': 'w-6 h-6',
    'xl': 'w-7 h-7',
    '2xl': 'w-8 h-8',
    '3xl': 'w-10 h-10',
  };
  const SUBTITLE_TEXT_SIZES: Record<string, string> = {
    'xs': 'text-xs',
    'sm': 'text-sm',
    'base': 'text-base',
  };
  
  const titleSizeClass = TITLE_SIZES[metadata?.header_title_size || '3xl'] || 'text-3xl';
  const iconSizeClass = ICON_SIZES[metadata?.header_icon_size || '3xl'] || 'w-10 h-10';
  const iconColorStyle = metadata?.header_icon_color ? { color: metadata.header_icon_color } : undefined;
  const subtitleTextSizeClass = SUBTITLE_TEXT_SIZES[metadata?.header_subtitle_text_size || 'xs'] || 'text-xs';
  const subtitleBgStyle = metadata?.header_subtitle_bg_color ? { backgroundColor: metadata.header_subtitle_bg_color } : undefined;

  const canEdit = canEditPageMetadata(globalRole) && pageKey;

  const handleOpenMetadataDialog = () => {
    setEditTitle(metadata?.header_title || defaultTitle);
    setEditSubtitle(metadata?.header_subtitle || defaultSubtitle);
    setEditMenuLabel(metadata?.menu_label || '');
    setEditTitleSize(metadata?.header_title_size || '3xl');
    setEditIconSize(metadata?.header_icon_size || '3xl');
    setEditIconColor(metadata?.header_icon_color || '');
    setEditSubtitleBgColor(metadata?.header_subtitle_bg_color || '');
    setEditSubtitleTextSize(metadata?.header_subtitle_text_size || 'xs');
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
        header_title_size: editTitleSize || '3xl',
        header_icon_size: editIconSize || '3xl',
        header_icon_color: editIconColor || null,
        header_subtitle_bg_color: editSubtitleBgColor || null,
        header_subtitle_text_size: editSubtitleTextSize || 'xs',
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

      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="h-20 px-4 flex items-center gap-3">
          {/* Left: Sidebar toggle + Back button */}
          <div className="flex items-center gap-2 shrink-0">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleSidebar}
            >
              <Menu className="w-5 h-5" />
            </Button>
            
            {showBackButton && (
              <Link to={parentRoute!}>
                <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">{parentLabel}</span>
                </Button>
              </Link>
            )}
          </div>

          {/* Center: Title with icon */}
          <div className="flex-1 flex items-center justify-center min-w-0">
            <div className="flex items-center gap-2">
              {PageIcon && (
                <PageIcon 
                  className={`${iconSizeClass} shrink-0 ${!iconColorStyle ? 'text-primary' : ''}`} 
                  style={iconColorStyle}
                />
              )}
              <h1 className={`${titleSizeClass} font-semibold text-foreground truncate`}>
                {formatHelpTitle(displayTitle)}
              </h1>
            </div>
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
        
        {/* Subtitle bar - below main header */}
        {displaySubtitle && (
          <div 
            className={`px-4 py-1 border-t border-border/50 ${!subtitleBgStyle ? 'bg-muted/30' : ''}`}
            style={subtitleBgStyle}
          >
            <p className={`${subtitleTextSizeClass} text-muted-foreground text-center truncate`}>
              {displaySubtitle}
            </p>
          </div>
        )}
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="meta-title-size">Taille du titre</Label>
                <select
                  id="meta-title-size"
                  value={editTitleSize}
                  onChange={(e) => setEditTitleSize(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="sm">Petit (sm)</option>
                  <option value="base">Normal (base)</option>
                  <option value="lg">Grand (lg)</option>
                  <option value="xl">Très grand (xl)</option>
                  <option value="2xl">Extra grand (2xl)</option>
                  <option value="3xl">Énorme (3xl)</option>
                  <option value="4xl">Maximum (4xl)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="meta-icon-size">Taille de l'icône</Label>
                <select
                  id="meta-icon-size"
                  value={editIconSize}
                  onChange={(e) => setEditIconSize(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="sm">Petit (sm)</option>
                  <option value="md">Moyen (md)</option>
                  <option value="lg">Grand (lg)</option>
                  <option value="xl">Très grand (xl)</option>
                  <option value="2xl">Extra grand (2xl)</option>
                  <option value="3xl">Maximum (3xl)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meta-icon-color">Couleur de l'icône</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="meta-icon-color"
                  type="color"
                  value={editIconColor || '#3b82f6'}
                  onChange={(e) => setEditIconColor(e.target.value)}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={editIconColor}
                  onChange={(e) => setEditIconColor(e.target.value)}
                  placeholder="#3b82f6 ou vide pour défaut"
                  className="flex-1"
                />
                {editIconColor && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setEditIconColor('')}
                  >
                    Reset
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Laissez vide pour utiliser la couleur primaire par défaut
              </p>
            </div>

            {/* Subtitle bar customization */}
            <div className="pt-4 border-t">
              <Label className="text-sm font-medium">Style de la barre de description</Label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="space-y-2">
                  <Label htmlFor="meta-subtitle-text-size">Taille du texte</Label>
                  <select
                    id="meta-subtitle-text-size"
                    value={editSubtitleTextSize}
                    onChange={(e) => setEditSubtitleTextSize(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="xs">Petit (xs)</option>
                    <option value="sm">Normal (sm)</option>
                    <option value="base">Grand (base)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meta-subtitle-bg">Couleur de fond</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="meta-subtitle-bg"
                      type="color"
                      value={editSubtitleBgColor || '#f3f4f6'}
                      onChange={(e) => setEditSubtitleBgColor(e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    {editSubtitleBgColor && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setEditSubtitleBgColor('')}
                      >
                        Reset
                      </Button>
                    )}
                  </div>
                </div>
              </div>
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
