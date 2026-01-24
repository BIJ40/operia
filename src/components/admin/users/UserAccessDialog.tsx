/**
 * Dialog complet récapitulatif et édition des accès d'un utilisateur
 * - Affiche le rôle, l'agence, le plan (éditable pour admins)
 * - Liste les sections/modules avec pages détaillées
 * - Permet les surcharges individuelles (overrides)
 */

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Eye, Shield, Building2, Lock, LockOpen, Check, X, ChevronDown, 
  Zap, Plus, Minus, AlertCircle
} from 'lucide-react';
import { GlobalRole, GLOBAL_ROLES } from '@/types/globalRoles';
import { EnabledModules, MODULE_DEFINITIONS, ModuleKey, isModuleEnabled, isModuleOptionEnabled } from '@/types/modules';
import { SITEMAP_ROUTES, SECTION_LABELS, SitemapSection } from '@/config/sitemapData';
import { getVisibleRoleLabel, getVisibleRoleColor } from '@/lib/visibleRoleLabels';
import { isHardcodedProtectedUser } from '@/hooks/access-rights/useProtectedAccess';
import { usePlanTiers } from '@/hooks/access-rights';
import { cn } from '@/lib/utils';

interface UserAccessDialogProps {
  userId: string;
  userName: string;
  globalRole: GlobalRole | null;
  agencyId?: string | null;
  agencyLabel?: string | null;
  enabledModules: EnabledModules | null;
  planKey?: string | null;
  planLabel?: string | null;
  canEdit?: boolean;
  onPlanChange?: (newPlanKey: string) => void;
  onModuleToggle?: (moduleKey: ModuleKey, enabled: boolean, optionKey?: string) => void;
}

/**
 * Modules "spéciaux" = accès individuels hors plan standard
 */
const SPECIAL_ACCESS_KEYS: { moduleKey: ModuleKey; optionKey?: string; label: string; icon: string }[] = [
  { moduleKey: 'apogee_tickets', label: 'Gestion de Projet', icon: 'FolderKanban' },
  { moduleKey: 'support', optionKey: 'agent', label: 'Agent Support', icon: 'LifeBuoy' },
  { moduleKey: 'help_academy', optionKey: 'edition', label: 'Contributeur FAQ', icon: 'BookOpen' },
];

/**
 * Sections pertinentes à afficher (exclure dev, public, etc.)
 */
const VISIBLE_SECTIONS: SitemapSection[] = ['core', 'academy', 'pilotage', 'rh', 'support', 'reseau', 'projects', 'admin'];

export function UserAccessDialog({
  userId,
  userName,
  globalRole,
  agencyId,
  agencyLabel,
  enabledModules,
  planKey,
  planLabel,
  canEdit = false,
  onPlanChange,
  onModuleToggle,
}: UserAccessDialogProps) {
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [expandedSections, setExpandedSections] = useState<SitemapSection[]>([]);
  
  const { data: planTiers } = usePlanTiers();
  
  const isProtected = isHardcodedProtectedUser(userId);
  const userLevel = globalRole ? GLOBAL_ROLES[globalRole] ?? 0 : 0;
  const isN5Plus = userLevel >= GLOBAL_ROLES.platform_admin;
  
  // Regrouper les routes par section
  const routesBySection = useMemo(() => {
    const grouped: Partial<Record<SitemapSection, typeof SITEMAP_ROUTES>> = {};
    
    for (const route of SITEMAP_ROUTES) {
      // Ignorer redirects et routes dynamiques de détail
      if (route.isRedirect || route.isDynamic) continue;
      if (!VISIBLE_SECTIONS.includes(route.section)) continue;
      
      if (!grouped[route.section]) {
        grouped[route.section] = [];
      }
      grouped[route.section]!.push(route);
    }
    
    return grouped;
  }, []);
  
  // Calculer l'accès pour chaque route
  const accessBySection = useMemo(() => {
    const result: Partial<Record<SitemapSection, { route: typeof SITEMAP_ROUTES[0]; hasAccess: boolean }[]>> = {};
    
    for (const [section, routes] of Object.entries(routesBySection)) {
      result[section as SitemapSection] = routes!.map(route => {
        // Vérifier le rôle minimum
        const minRole = route.guards?.roleGuard?.minRole;
        const minLevel = minRole ? GLOBAL_ROLES[minRole] ?? 0 : 0;
        const hasRoleLevel = userLevel >= minLevel;
        
        // Vérifier le module
        let hasModuleAccess = true;
        if (route.guards?.moduleGuard?.moduleKey) {
          const moduleKey = route.guards.moduleGuard.moduleKey as ModuleKey;
          const optionKey = route.guards.moduleGuard.requiredOption;
          
          if (optionKey) {
            hasModuleAccess = isModuleOptionEnabled(enabledModules, moduleKey, optionKey);
          } else {
            hasModuleAccess = isModuleEnabled(enabledModules, moduleKey);
          }
          
          // N5+ bypass
          if (isN5Plus) hasModuleAccess = true;
        }
        
        return {
          route,
          hasAccess: hasRoleLevel && hasModuleAccess,
        };
      });
    }
    
    return result;
  }, [routesBySection, userLevel, enabledModules, isN5Plus]);
  
  // Compter les accès par section
  const sectionStats = useMemo(() => {
    const stats: Partial<Record<SitemapSection, { total: number; accessible: number }>> = {};
    
    for (const [section, routes] of Object.entries(accessBySection)) {
      stats[section as SitemapSection] = {
        total: routes!.length,
        accessible: routes!.filter(r => r.hasAccess).length,
      };
    }
    
    return stats;
  }, [accessBySection]);
  
  // Total global
  const totalStats = useMemo(() => {
    let total = 0;
    let accessible = 0;
    for (const stat of Object.values(sectionStats)) {
      total += stat!.total;
      accessible += stat!.accessible;
    }
    return { total, accessible };
  }, [sectionStats]);
  
  // Accès spéciaux activés
  const specialAccess = useMemo(() => {
    return SPECIAL_ACCESS_KEYS.map(sa => ({
      ...sa,
      enabled: sa.optionKey
        ? isModuleOptionEnabled(enabledModules, sa.moduleKey, sa.optionKey)
        : isModuleEnabled(enabledModules, sa.moduleKey),
    }));
  }, [enabledModules]);
  
  const toggleSection = (section: SitemapSection) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };
  
  const handleSpecialAccessToggle = (moduleKey: ModuleKey, optionKey?: string) => {
    if (!onModuleToggle) return;
    
    const currentlyEnabled = optionKey
      ? isModuleOptionEnabled(enabledModules, moduleKey, optionKey)
      : isModuleEnabled(enabledModules, moduleKey);
    
    onModuleToggle(moduleKey, !currentlyEnabled, optionKey);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8"
          title="Voir les accès"
        >
          <Eye className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] p-0 flex flex-col">
        {/* Header fixe */}
        <DialogHeader className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">{userName}</DialogTitle>
            <div className="flex items-center gap-2">
              {isProtected && (
                <Badge variant="outline" className="text-warning border-warning/50 gap-1 text-xs">
                  <Lock className="h-3 w-3" />
                  Protégé
                </Badge>
              )}
              {canEdit && (
                <Button 
                  variant={editMode ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setEditMode(!editMode)}
                  className="gap-1.5"
                >
                  {editMode ? <LockOpen className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  {editMode ? 'Verrouiller' : 'Éditer'}
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>
        
        <ScrollArea className="flex-1 px-4 pb-4">
          <div className="space-y-4 pt-3">
            {/* Rôle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                Rôle
              </div>
              <Badge className={getVisibleRoleColor(globalRole)} variant="secondary">
                {getVisibleRoleLabel(globalRole)}
              </Badge>
            </div>

            {/* Agence + Plan (éditable) */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                Agence
              </div>
              <div className="flex items-center gap-2">
                {agencyLabel ? (
                  <>
                    <span className="text-sm font-medium">{agencyLabel}</span>
                    {editMode && planTiers && agencyId && onPlanChange ? (
                      <Select value={planKey || ''} onValueChange={onPlanChange}>
                        <SelectTrigger className="w-[100px] h-7 text-xs">
                          <SelectValue placeholder="Plan" />
                        </SelectTrigger>
                        <SelectContent>
                          {planTiers.map(tier => (
                            <SelectItem key={tier.key} value={tier.key}>
                              {tier.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      planLabel && (
                        <Badge 
                          variant={planLabel === 'PRO' ? 'default' : 'secondary'}
                          className="text-xs cursor-pointer"
                          title="Cliquez pour éditer le plan de l'agence"
                        >
                          {planLabel}
                        </Badge>
                      )
                    )}
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground italic">Sans agence</span>
                )}
              </div>
            </div>

            <Separator />

            {/* Accès spéciaux */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Zap className="h-4 w-4" />
                Accès spéciaux
              </div>
              <div className="grid gap-2">
                {specialAccess.map(sa => (
                  <div 
                    key={`${sa.moduleKey}-${sa.optionKey || 'root'}`}
                    className={cn(
                      "flex items-center justify-between py-1.5 px-2 rounded-md text-sm",
                      sa.enabled ? "bg-primary/5" : "bg-muted/30"
                    )}
                  >
                    <span className={cn(!sa.enabled && "text-muted-foreground")}>
                      {sa.label}
                    </span>
                    {editMode && onModuleToggle ? (
                      <Switch 
                        checked={sa.enabled}
                        onCheckedChange={() => handleSpecialAccessToggle(sa.moduleKey, sa.optionKey)}
                      />
                    ) : (
                      sa.enabled ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground" />
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Pages par section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Pages accessibles</span>
                <Badge variant="outline" className="text-xs">
                  {totalStats.accessible}/{totalStats.total}
                </Badge>
              </div>
              
              <div className="space-y-1">
                {VISIBLE_SECTIONS.map(section => {
                  const stats = sectionStats[section];
                  const routes = accessBySection[section];
                  if (!stats || !routes || routes.length === 0) return null;
                  
                  const isExpanded = expandedSections.includes(section);
                  const allAccessible = stats.accessible === stats.total;
                  const noneAccessible = stats.accessible === 0;
                  
                  return (
                    <Collapsible 
                      key={section} 
                      open={isExpanded}
                      onOpenChange={() => toggleSection(section)}
                    >
                      <CollapsibleTrigger asChild>
                        <button 
                          className={cn(
                            "w-full flex items-center justify-between py-2 px-2 rounded-md text-sm hover:bg-muted/50 transition-colors",
                            allAccessible && "bg-success/5",
                            noneAccessible && "bg-muted/30 opacity-70"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <ChevronDown className={cn(
                              "h-4 w-4 transition-transform",
                              isExpanded && "rotate-180"
                            )} />
                            <span className="font-medium">{SECTION_LABELS[section]}</span>
                          </div>
                          <Badge 
                            variant={allAccessible ? "default" : noneAccessible ? "secondary" : "outline"}
                            className="text-xs"
                          >
                            {stats.accessible}/{stats.total}
                          </Badge>
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="ml-6 mt-1 space-y-0.5 border-l pl-3 pb-2">
                          {routes.map(({ route, hasAccess }) => (
                            <div 
                              key={route.path}
                              className={cn(
                                "flex items-center justify-between text-xs py-1 px-2 rounded",
                                hasAccess 
                                  ? "text-foreground" 
                                  : "text-muted-foreground opacity-60"
                              )}
                            >
                              <span className="truncate">{route.label}</span>
                              {hasAccess ? (
                                <Check className="h-3 w-3 text-success shrink-0" />
                              ) : (
                                <X className="h-3 w-3 text-muted-foreground shrink-0" />
                              )}
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            </div>
            
            {/* Note informative */}
            {agencyId && (
              <div className="flex items-start gap-2 p-2 bg-muted/30 rounded-md text-xs text-muted-foreground">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>
                  Modifier le plan affecte <strong>tous les utilisateurs</strong> de cette agence.
                </span>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
