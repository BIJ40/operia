/**
 * Right column of UserFullDialog — permissions view
 * Extracted from UserFullDialog.tsx — no behavioral change.
 */

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import {
  Shield, Building2, Check, X, ChevronDown,
  Zap, Plus, AlertCircle, PlusCircle
} from 'lucide-react';
import { GlobalRole, GLOBAL_ROLES } from '@/types/globalRoles';
import { EnabledModules, ModuleKey, isModuleEnabled, isModuleOptionEnabled } from '@/types/modules';
import { SITEMAP_ROUTES, SECTION_LABELS, SitemapSection } from '@/config/sitemapData';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { SPECIAL_ACCESS_KEYS, VISIBLE_SECTIONS } from './constants';

interface UserPermissionsColumnProps {
  editMode: boolean;
  globalRole: GlobalRole | null;
  enabledModules: EnabledModules | null;
  planKey?: string | null;
  planLabel?: string | null;
  agencyId?: string | null;
  pageOverrides: string[];
  onPlanChange?: (newPlanKey: string) => void;
  onModuleToggle?: (moduleKey: ModuleKey, enabled: boolean, optionKey?: string) => void;
  onPageOverrideToggle?: (pagePath: string, enabled: boolean) => void;
}

export function UserPermissionsColumn({
  editMode,
  globalRole,
  enabledModules,
  planKey,
  planLabel,
  agencyId,
  pageOverrides,
  onPlanChange,
  onModuleToggle,
  onPageOverrideToggle,
}: UserPermissionsColumnProps) {
  const [expandedSections, setExpandedSections] = useState<SitemapSection[]>([]);
  const [addAccessOpen, setAddAccessOpen] = useState(false);
  const { data: planTiers } = useQuery({
    queryKey: ['plan-catalog-labels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_catalog')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return (data || []).map(p => ({ key: p.slug?.toUpperCase() || p.id, label: p.name }));
    },
    staleTime: 5 * 60_000,
  });

  const userLevel = globalRole ? GLOBAL_ROLES[globalRole] ?? 0 : 0;
  const isN5Plus = userLevel >= GLOBAL_ROLES.platform_admin;

  // Routes by section
  const routesBySection = useMemo(() => {
    const grouped: Partial<Record<SitemapSection, typeof SITEMAP_ROUTES>> = {};
    for (const route of SITEMAP_ROUTES) {
      if (route.isRedirect || route.isDynamic) continue;
      if (!VISIBLE_SECTIONS.includes(route.section)) continue;
      if (!grouped[route.section]) grouped[route.section] = [];
      grouped[route.section]!.push(route);
    }
    return grouped;
  }, []);

  // Access by section
  const accessBySection = useMemo(() => {
    const result: Partial<Record<SitemapSection, { route: typeof SITEMAP_ROUTES[0]; hasAccess: boolean; hasOverride: boolean }[]>> = {};
    for (const [section, routes] of Object.entries(routesBySection)) {
      result[section as SitemapSection] = routes!.map(route => {
        const hasOverride = pageOverrides.includes(route.path);
        if (hasOverride) return { route, hasAccess: true, hasOverride: true };

        const minRole = route.guards?.roleGuard?.minRole;
        const minLevel = minRole ? GLOBAL_ROLES[minRole] ?? 0 : 0;
        const hasRoleLevel = userLevel >= minLevel;

        let hasModuleAccess = true;
        if (route.guards?.moduleGuard?.moduleKey) {
          const moduleKey = route.guards.moduleGuard.moduleKey as ModuleKey;
          const optionKey = route.guards.moduleGuard.requiredOption;
          hasModuleAccess = optionKey
            ? isModuleOptionEnabled(enabledModules, moduleKey, optionKey)
            : isModuleEnabled(enabledModules, moduleKey);
          if (isN5Plus) hasModuleAccess = true;
        }

        return { route, hasAccess: hasRoleLevel && hasModuleAccess, hasOverride: false };
      });
    }
    return result;
  }, [routesBySection, userLevel, enabledModules, isN5Plus, pageOverrides]);

  const inaccessiblePages = useMemo(() => {
    const pages: { path: string; label: string; section: SitemapSection }[] = [];
    for (const [section, routes] of Object.entries(accessBySection)) {
      for (const { route, hasAccess } of routes!) {
        if (!hasAccess) {
          pages.push({ path: route.path, label: route.label, section: section as SitemapSection });
        }
      }
    }
    return pages;
  }, [accessBySection]);

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

  const totalStats = useMemo(() => {
    let total = 0, accessible = 0;
    for (const stat of Object.values(sectionStats)) {
      total += stat!.total;
      accessible += stat!.accessible;
    }
    return { total, accessible };
  }, [sectionStats]);

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
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  const handleSpecialAccessToggle = (moduleKey: ModuleKey, optionKey?: string) => {
    if (!onModuleToggle) return;
    const currentlyEnabled = optionKey
      ? isModuleOptionEnabled(enabledModules, moduleKey, optionKey)
      : isModuleEnabled(enabledModules, moduleKey);
    onModuleToggle(moduleKey, !currentlyEnabled, optionKey);
  };

  const handleAddPageAccess = (pagePath: string) => {
    if (!onPageOverrideToggle) return;
    onPageOverrideToggle(pagePath, true);
    setAddAccessOpen(false);
  };

  const handleRemovePageAccess = (pagePath: string) => {
    if (!onPageOverrideToggle) return;
    onPageOverrideToggle(pagePath, false);
  };

  return (
    <ScrollArea className="flex-1 p-5 bg-muted/20">
      <div className="space-y-5">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Permissions
        </h3>

        {/* Plan */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-background border">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Plan agence</span>
          </div>
          {editMode && planTiers && agencyId && onPlanChange ? (
            <Select value={planKey || ''} onValueChange={onPlanChange}>
              <SelectTrigger className="w-[100px] h-8 rounded-lg text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {planTiers.map(tier => (
                  <SelectItem key={tier.key} value={tier.key}>{tier.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Badge variant={planLabel === 'PRO' ? 'default' : 'secondary'} className="rounded-lg">
              {planLabel || 'Aucun'}
            </Badge>
          )}
        </div>

        {/* Special access */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Zap className="h-4 w-4 text-amber-500" />
            Accès spéciaux
          </div>
          <div className="grid gap-2">
            {specialAccess.map(sa => (
              <div
                key={`${sa.moduleKey}-${sa.optionKey || 'root'}`}
                className={cn(
                  "flex items-center justify-between py-2.5 px-3 rounded-xl text-sm border transition-colors",
                  sa.enabled ? "bg-success/5 border-success/30" : "bg-background"
                )}
              >
                <span className={cn(!sa.enabled && "text-muted-foreground")}>{sa.label}</span>
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

        {/* Pages */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Pages accessibles</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-lg text-xs">
                {totalStats.accessible}/{totalStats.total}
              </Badge>
              {editMode && onPageOverrideToggle && inaccessiblePages.length > 0 && (
                <Popover open={addAccessOpen} onOpenChange={setAddAccessOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 gap-1 text-xs rounded-lg">
                      <PlusCircle className="h-3 w-3" />
                      Ajouter
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-0 rounded-xl" align="end">
                    <Command>
                      <CommandInput placeholder="Rechercher..." />
                      <CommandList>
                        <CommandEmpty>Aucune page trouvée</CommandEmpty>
                        <CommandGroup>
                          {inaccessiblePages.map(page => (
                            <CommandItem
                              key={page.path}
                              value={`${page.label} ${page.path}`}
                              onSelect={() => handleAddPageAccess(page.path)}
                            >
                              <div className="flex flex-col">
                                <span>{page.label}</span>
                                <span className="text-xs text-muted-foreground">
                                  {SECTION_LABELS[page.section]}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>

          {/* Overrides */}
          {pageOverrides.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {pageOverrides.map(path => {
                const route = SITEMAP_ROUTES.find(r => r.path === path);
                return (
                  <Badge
                    key={path}
                    className="text-xs gap-1 bg-success/80 hover:bg-success rounded-lg"
                  >
                    <Plus className="h-3 w-3" />
                    {route?.label || path}
                    {editMode && onPageOverrideToggle && (
                      <button
                        onClick={() => handleRemovePageAccess(path)}
                        className="ml-1 hover:text-destructive-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                );
              })}
            </div>
          )}

          {/* Sections */}
          <div className="space-y-1">
            {VISIBLE_SECTIONS.map(section => {
              const stats = sectionStats[section];
              const routes = accessBySection[section];
              if (!stats || !routes || routes.length === 0) return null;

              const isExpanded = expandedSections.includes(section);
              const allAccessible = stats.accessible === stats.total;
              const noneAccessible = stats.accessible === 0;

              return (
                <Collapsible key={section} open={isExpanded} onOpenChange={() => toggleSection(section)}>
                  <CollapsibleTrigger asChild>
                    <button className={cn(
                      "w-full flex items-center justify-between py-2.5 px-3 rounded-xl text-sm hover:bg-muted/50 transition-colors border",
                      allAccessible && "bg-success/5 border-success/20",
                      noneAccessible && "bg-muted/30 opacity-70 border-transparent"
                    )}>
                      <div className="flex items-center gap-2">
                        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
                        <span className="font-medium">{SECTION_LABELS[section]}</span>
                      </div>
                      <Badge variant={allAccessible ? "default" : noneAccessible ? "secondary" : "outline"} className="rounded-lg text-xs">
                        {stats.accessible}/{stats.total}
                      </Badge>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-6 mt-1 space-y-0.5 border-l pl-3 pb-2">
                      {routes.map(({ route, hasAccess, hasOverride }) => (
                        <div
                          key={route.path}
                          className={cn(
                            "flex items-center justify-between text-xs py-1.5 px-2 rounded-lg",
                            hasAccess ? "text-foreground" : "text-muted-foreground opacity-60",
                            hasOverride && "bg-success/10"
                          )}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="truncate">{route.label}</span>
                            {hasOverride && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1 border-success text-success rounded">
                                +
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {hasAccess ? (
                              <Check className="h-3 w-3 text-success" />
                            ) : editMode && onPageOverrideToggle ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={e => { e.stopPropagation(); handleAddPageAccess(route.path); }}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            ) : (
                              <X className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </div>

        {/* Info note */}
        {agencyId && (
          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-xl text-xs text-muted-foreground">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              Le plan affecte <strong>tous les utilisateurs</strong> de l'agence.
              Les accès individuels (+) s'appliquent uniquement à cet utilisateur.
            </span>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
