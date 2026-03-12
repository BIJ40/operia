import { useState } from "react";
import { 
  ChevronDown, 
  ChevronRight, 
  ArrowRight, 
  Variable,
  Shield,
  Box,
  Lock,
  Globe,
  ExternalLink,
  Copy,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  SECTION_LABELS, 
  type RouteMetadata, 
  type SitemapSection 
} from "@/config/sitemapData";
import { type GlobalRole } from "@/types/globalRoles";
import { VISIBLE_ROLE_LABELS } from '@/lib/visibleRoleLabels';
import { useModuleLabels } from "@/hooks/useModuleLabels";
import { getPlanLabel } from "@/config/planTiers";
import { toast } from "sonner";

export interface SitemapTreeProps {
  routes: RouteMetadata[];
  groupedBySection: Map<SitemapSection, RouteMetadata[]>;
}

// Role level for ordering badges
const ROLE_LEVELS: Record<GlobalRole, number> = {
  base_user: 1,
  franchisee_user: 2,
  franchisee_admin: 3,
  franchisor_user: 4,
  franchisor_admin: 5,
  platform_admin: 6,
  superadmin: 7,
};

function getRoleBadgeVariant(role: GlobalRole): string {
  const level = ROLE_LEVELS[role];
  if (level >= 8) return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  if (level >= 6) return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
  if (level >= 4) return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
  if (level >= 3) return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
  return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
}

function getGuardColor(route: RouteMetadata): string {
  const { roleGuard, moduleGuard, specialGuard } = route.guards;
  
  if (specialGuard) return "border-l-amber-500";
  if (roleGuard && moduleGuard) return "border-l-emerald-500";
  if (roleGuard) return "border-l-blue-500";
  if (moduleGuard) return "border-l-violet-500";
  return "border-l-gray-300 dark:border-l-gray-600";
}

function RouteItem({ route }: { route: RouteMetadata }) {
  const [copied, setCopied] = useState(false);
  const { roleGuard, moduleGuard, specialGuard } = route.guards;

  const copyPath = async () => {
    await navigator.clipboard.writeText(route.path);
    setCopied(true);
    toast.success("Path copié !");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "group flex items-center gap-2 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors border-l-4",
        getGuardColor(route),
        route.isRedirect && "opacity-60"
      )}
    >
      {/* Icons */}
      <div className="flex items-center gap-1 shrink-0">
        {route.isRedirect && (
          <Tooltip>
            <TooltipTrigger>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              Redirection vers {route.redirectTo}
            </TooltipContent>
          </Tooltip>
        )}
        {route.isDynamic && (
          <Tooltip>
            <TooltipTrigger>
              <Variable className="w-4 h-4 text-cyan-600" />
            </TooltipTrigger>
            <TooltipContent>Route dynamique</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Path */}
      <button
        onClick={copyPath}
        className="font-mono text-sm text-foreground hover:text-primary transition-colors flex items-center gap-1"
      >
        {route.path}
        {copied ? (
          <Check className="w-3 h-3 text-emerald-500" />
        ) : (
          <Copy className="w-3 h-3 opacity-0 group-hover:opacity-50" />
        )}
      </button>

      {/* Label */}
      <span className="text-sm text-muted-foreground hidden md:inline">
        {route.label}
      </span>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Guards & Badges */}
      <div className="flex items-center gap-1.5 flex-wrap justify-end">
        {/* Special Guard */}
        {specialGuard && (
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-300 gap-1">
                <Lock className="w-3 h-3" />
                {specialGuard}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>Guard spécial: {specialGuard}</TooltipContent>
          </Tooltip>
        )}

        {/* Role Guard */}
        {roleGuard && (
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className={cn("gap-1", getRoleBadgeVariant(roleGuard.minRole))}>
                <Shield className="w-3 h-3" />
                {VISIBLE_ROLE_LABELS[roleGuard.minRole]?.replace('Utilisateur ', '').replace('Administrateur ', 'Admin ')}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              Rôle minimum: {VISIBLE_ROLE_LABELS[roleGuard.minRole]}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Module Guard */}
        {moduleGuard && (
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className="bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300 border-violet-300 gap-1">
                <Box className="w-3 h-3" />
                {MODULE_LABELS[moduleGuard.moduleKey]?.split(' ')[0] || moduleGuard.moduleKey}
                {moduleGuard.requiredOption && (
                  <span className="text-[10px] opacity-75">.{moduleGuard.requiredOption}</span>
                )}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              Module: {MODULE_LABELS[moduleGuard.moduleKey] || moduleGuard.moduleKey}
              {moduleGuard.requiredOption && <br />}
              {moduleGuard.requiredOption && `Option: ${moduleGuard.requiredOption}`}
              {moduleGuard.requiredOptions && <br />}
              {moduleGuard.requiredOptions && `Options: ${moduleGuard.requiredOptions.join(', ')}`}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Plan Required */}
        {route.planRequired && (
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-300 gap-1">
                <Lock className="w-3 h-3" />
                {getPlanLabel(route.planRequired)}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              Plan agence minimum: {getPlanLabel(route.planRequired)}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Public route indicator */}
        {!roleGuard && !moduleGuard && !specialGuard && !route.isRedirect && !route.planRequired && (
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 gap-1">
                <Globe className="w-3 h-3" />
                Public
              </Badge>
            </TooltipTrigger>
            <TooltipContent>Route publique (aucun guard)</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Open link */}
      {!route.isRedirect && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="w-6 h-6 opacity-0 group-hover:opacity-100"
              onClick={() => window.open(route.path.replace(/:\w+/g, 'test'), '_blank')}
            >
              <ExternalLink className="w-3 h-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Ouvrir dans un nouvel onglet</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

function SectionGroup({ 
  section, 
  routes,
  defaultOpen = true 
}: { 
  section: SitemapSection; 
  routes: RouteMetadata[];
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const activeRoutes = routes.filter(r => !r.isRedirect).length;
  const redirectRoutes = routes.filter(r => r.isRedirect).length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 h-10 px-3 font-medium"
        >
          {isOpen ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          <span>{SECTION_LABELS[section]}</span>
          <Badge variant="secondary" className="ml-auto">
            {activeRoutes}
            {redirectRoutes > 0 && (
              <span className="text-muted-foreground ml-1">
                +{redirectRoutes}
              </span>
            )}
          </Badge>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-4 border-l border-border pl-2 space-y-0.5">
          {routes.map((route) => (
            <RouteItem key={route.path} route={route} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function SitemapTree({ routes, groupedBySection }: SitemapTreeProps) {
  const sections = Array.from(groupedBySection.keys()) as SitemapSection[];

  if (routes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Aucune route ne correspond aux filtres
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {sections.map((section) => (
        <SectionGroup
          key={section}
          section={section}
          routes={groupedBySection.get(section) || []}
        />
      ))}
    </div>
  );
}
