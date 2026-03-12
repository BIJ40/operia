import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  ArrowUpDown, 
  ArrowRight, 
  Variable, 
  Copy, 
  Check,
  Download,
  Shield,
  Box,
  Lock,
  Globe
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  SECTION_LABELS, 
  type RouteMetadata,
} from "@/config/sitemapData";
import { VISIBLE_ROLE_LABELS } from '@/lib/visibleRoleLabels';
import { useModuleLabels } from "@/hooks/useModuleLabels";
import { toast } from "sonner";

interface SitemapTableProps {
  routes: RouteMetadata[];
}

type SortKey = 'path' | 'label' | 'section' | 'component';
type SortDirection = 'asc' | 'desc';

export function SitemapTable({ routes }: SitemapTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('path');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const { getLabel } = useModuleLabels();

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedRoutes = [...routes].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    const comparison = aVal.localeCompare(bVal);
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const copyPath = async (path: string) => {
    await navigator.clipboard.writeText(path);
    setCopiedPath(path);
    toast.success("Path copié !");
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const exportToJson = () => {
    const data = JSON.stringify(routes, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sitemap-routes.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export JSON téléchargé !");
  };

  const SortButton = ({ column, label }: { column: SortKey; label: string }) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8"
      onClick={() => handleSort(column)}
    >
      {label}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={exportToJson}>
          <Download className="w-4 h-4 mr-2" />
          Export JSON
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">
                <SortButton column="path" label="Path" />
              </TableHead>
              <TableHead className="w-[200px]">
                <SortButton column="label" label="Label" />
              </TableHead>
              <TableHead className="w-[120px]">
                <SortButton column="section" label="Section" />
              </TableHead>
              <TableHead>Guards</TableHead>
              <TableHead className="w-[180px]">
                <SortButton column="component" label="Composant" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRoutes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Aucune route ne correspond aux filtres
                </TableCell>
              </TableRow>
            ) : (
              sortedRoutes.map((route) => (
                <TableRow 
                  key={route.path}
                  className={cn(route.isRedirect && "opacity-60")}
                >
                  {/* Path */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {route.isRedirect && (
                        <Tooltip>
                          <TooltipTrigger>
                            <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                          </TooltipTrigger>
                          <TooltipContent>→ {route.redirectTo}</TooltipContent>
                        </Tooltip>
                      )}
                      {route.isDynamic && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Variable className="w-4 h-4 text-cyan-600 shrink-0" />
                          </TooltipTrigger>
                          <TooltipContent>Route dynamique</TooltipContent>
                        </Tooltip>
                      )}
                      <button
                        onClick={() => copyPath(route.path)}
                        className="font-mono text-sm hover:text-primary transition-colors flex items-center gap-1 text-left"
                      >
                        <span className="truncate max-w-[240px]">{route.path}</span>
                        {copiedPath === route.path ? (
                          <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                        ) : (
                          <Copy className="w-3 h-3 opacity-30 shrink-0" />
                        )}
                      </button>
                    </div>
                  </TableCell>

                  {/* Label */}
                  <TableCell className="text-muted-foreground">
                    {route.label}
                  </TableCell>

                  {/* Section */}
                  <TableCell>
                    <Badge variant="outline" className="font-normal">
                      {SECTION_LABELS[route.section]}
                    </Badge>
                  </TableCell>

                  {/* Guards */}
                  <TableCell>
                    <div className="flex items-center gap-1 flex-wrap">
                      {route.guards.specialGuard && (
                        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 gap-1">
                          <Lock className="w-3 h-3" />
                          {route.guards.specialGuard}
                        </Badge>
                      )}
                      {route.guards.roleGuard && (
                        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 gap-1">
                          <Shield className="w-3 h-3" />
                          {VISIBLE_ROLE_LABELS[route.guards.roleGuard.minRole]?.split(' ')[0]}
                        </Badge>
                      )}
                      {route.guards.moduleGuard && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge className="bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300 gap-1">
                              <Box className="w-3 h-3" />
                              {MODULE_LABELS[route.guards.moduleGuard.moduleKey]?.split(' ')[0] || route.guards.moduleGuard.moduleKey}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            {route.guards.moduleGuard.requiredOption && `Option: ${route.guards.moduleGuard.requiredOption}`}
                            {route.guards.moduleGuard.requiredOptions && `Options: ${route.guards.moduleGuard.requiredOptions.join(', ')}`}
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {!route.guards.roleGuard && !route.guards.moduleGuard && !route.guards.specialGuard && !route.isRedirect && (
                        <Badge variant="secondary" className="gap-1">
                          <Globe className="w-3 h-3" />
                          Public
                        </Badge>
                      )}
                      {route.isRedirect && (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>

                  {/* Component */}
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {route.component}
                    </code>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
