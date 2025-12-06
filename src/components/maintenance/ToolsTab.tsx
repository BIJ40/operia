/**
 * Onglet Matériel & EPI - Liste et filtres des outils/EPI de l'agence
 */

import { useState } from 'react';
import { useTools } from '@/hooks/maintenance/useTools';
import type { Tool, ToolsFilters, ToolStatus, ToolCategory } from '@/types/maintenance';
import { TOOL_STATUSES, TOOL_CATEGORIES } from '@/types/maintenance';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus } from 'lucide-react';

export function ToolsTab() {
  const [filters, setFilters] = useState<ToolsFilters>({
    category: undefined,
    status: undefined,
    collaboratorId: undefined,
    search: '',
  });

  const { data: tools = [], isLoading } = useTools(undefined, filters);

  const handleSearchChange = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value || undefined }));
  };

  const handleStatusChange = (status: ToolStatus | 'all') => {
    setFilters((prev) => ({
      ...prev,
      status: status === 'all' ? undefined : status,
    }));
  };

  const handleCategoryChange = (category: ToolCategory | 'all') => {
    setFilters((prev) => ({
      ...prev,
      category: category === 'all' ? undefined : category,
    }));
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Matériel & EPI</CardTitle>
          <CardDescription>
            Suivi du matériel, des EPI et des contrôles associés
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Rechercher (libellé, n° série)"
            className="w-52"
            onChange={(e) => handleSearchChange(e.target.value)}
          />

          <Select
            defaultValue="all"
            onValueChange={(v) => handleCategoryChange(v as ToolCategory | 'all')}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes catégories</SelectItem>
              {TOOL_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            defaultValue="all"
            onValueChange={(v) => handleStatusChange(v as ToolStatus | 'all')}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              {TOOL_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button type="button" size="sm" variant="outline" className="gap-1">
            <Plus className="h-3.5 w-3.5" />
            Matériel
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <ToolsSkeleton />
        ) : tools.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Aucun matériel trouvé avec ces filtres.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-4 text-left font-medium">Libellé</th>
                  <th className="px-4 py-2 text-left font-medium">Catégorie</th>
                  <th className="px-4 py-2 text-left font-medium">Statut</th>
                  <th className="px-4 py-2 text-left font-medium">Affecté à</th>
                  <th className="px-4 py-2 text-left font-medium">Plan préventif</th>
                </tr>
              </thead>
              <tbody>
                {tools.map((tool) => (
                  <ToolRow key={tool.id} tool={tool} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ToolsSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-32" />
        </div>
      ))}
    </div>
  );
}

interface ToolRowProps {
  tool: Tool;
}

function ToolRow({ tool }: ToolRowProps) {
  const statusConfig = TOOL_STATUSES.find((s) => s.value === tool.status);
  const categoryConfig = TOOL_CATEGORIES.find((c) => c.value === tool.category);
  const statusVariant = tool.status === 'in_service' ? 'default' : 'secondary';

  const planLabel = tool.plan_template?.name || (
    <span className="text-muted-foreground">Aucun plan</span>
  );

  return (
    <tr className="border-b hover:bg-muted/40 cursor-pointer">
      <td className="py-2 pr-4 align-middle">
        <div className="flex flex-col">
          <span className="font-medium">{tool.label}</span>
          {tool.serial_number && (
            <span className="text-xs text-muted-foreground font-mono">
              N° {tool.serial_number}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-2 align-middle text-sm">
        {categoryConfig?.label || tool.category}
      </td>
      <td className="px-4 py-2 align-middle">
        <Badge variant={statusVariant} className="text-xs">
          {statusConfig?.label || tool.status}
        </Badge>
      </td>
      <td className="px-4 py-2 align-middle text-sm">
        {tool.collaborator
          ? `${tool.collaborator.first_name} ${tool.collaborator.last_name}`
          : <span className="text-muted-foreground">Non affecté</span>}
      </td>
      <td className="px-4 py-2 align-middle text-sm">{planLabel}</td>
    </tr>
  );
}
