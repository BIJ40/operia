/**
 * Page d'administration des Feature Flags
 * Permet d'activer/désactiver les modules dynamiquement
 * + Suivi du statut de développement (done, in_progress, todo, disabled)
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Search, Info, ChevronDown } from 'lucide-react';
import {
  useFeatureFlags,
  useUpdateFeatureFlag,
  useUpdateDevStatus,
  groupFlagsByGroup,
  MODULE_GROUP_LABELS,
  DEV_STATUS_CONFIG,
  type FeatureFlag,
  type DevStatus,
} from '@/hooks/useFeatureFlags';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';


const GROUP_COLORS: Record<string, string> = {
  rh: 'bg-violet-500/10 text-violet-700 border-violet-200',
  pilotage: 'bg-blue-500/10 text-blue-700 border-blue-200',
  support: 'bg-green-500/10 text-green-700 border-green-200',
  academy: 'bg-amber-500/10 text-amber-700 border-amber-200',
  reseau: 'bg-rose-500/10 text-rose-700 border-rose-200',
  commercial: 'bg-cyan-500/10 text-cyan-700 border-cyan-200',
  admin: 'bg-slate-500/10 text-slate-700 border-slate-200',
};

const DEV_STATUS_OPTIONS: DevStatus[] = ['done', 'in_progress', 'todo', 'disabled'];

function DevStatusDropdown({ 
  flag, 
  onUpdate, 
  isUpdating 
}: { 
  flag: FeatureFlag; 
  onUpdate: (id: string, status: DevStatus) => void;
  isUpdating: boolean;
}) {
  const currentStatus = DEV_STATUS_CONFIG[flag.dev_status] || DEV_STATUS_CONFIG.todo;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger 
        disabled={isUpdating}
        className={cn(
          'flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-colors',
          currentStatus.color,
          isUpdating && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span>{currentStatus.icon}</span>
        <span className="hidden sm:inline">{currentStatus.label}</span>
        <ChevronDown className="h-3 w-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {DEV_STATUS_OPTIONS.map((status) => {
          const config = DEV_STATUS_CONFIG[status];
          return (
            <DropdownMenuItem
              key={status}
              onClick={() => onUpdate(flag.id, status)}
              className={cn(
                'cursor-pointer',
                flag.dev_status === status && 'bg-muted'
              )}
            >
              <span className="mr-2">{config.icon}</span>
              {config.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FlagRow({ 
  flag, 
  onToggle, 
  onUpdateDevStatus,
  isUpdating,
  isUpdatingDevStatus,
}: { 
  flag: FeatureFlag; 
  onToggle: (id: string, enabled: boolean) => void;
  onUpdateDevStatus: (id: string, status: DevStatus) => void;
  isUpdating: boolean;
  isUpdatingDevStatus: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 px-4 border-b last:border-b-0 hover:bg-muted/30 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{flag.module_label}</span>
          {flag.description && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">{flag.description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {flag.module_key}
          </code>
          {flag.updated_at && (
            <span className="text-xs text-muted-foreground">
              Modifié {format(new Date(flag.updated_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <DevStatusDropdown 
          flag={flag} 
          onUpdate={onUpdateDevStatus} 
          isUpdating={isUpdatingDevStatus} 
        />
        <Badge variant={flag.is_enabled ? 'default' : 'secondary'} className="text-xs">
          {flag.is_enabled ? 'Actif' : 'Désactivé'}
        </Badge>
        <Switch
          checked={flag.is_enabled}
          onCheckedChange={(checked) => onToggle(flag.id, checked)}
          disabled={isUpdating}
        />
      </div>
    </div>
  );
}

function GroupCard({ 
  group, 
  flags, 
  onToggle,
  onUpdateDevStatus,
  updatingId,
  updatingDevStatusId,
}: { 
  group: string; 
  flags: FeatureFlag[];
  onToggle: (id: string, enabled: boolean) => void;
  onUpdateDevStatus: (id: string, status: DevStatus) => void;
  updatingId: string | null;
  updatingDevStatusId: string | null;
}) {
  const enabledCount = flags.filter(f => f.is_enabled).length;
  const colorClass = GROUP_COLORS[group] || 'bg-gray-500/10 text-gray-700 border-gray-200';

  return (
    <Card className="overflow-hidden">
      <CardHeader className={cn('py-3', colorClass)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {MODULE_GROUP_LABELS[group] || group}
          </CardTitle>
          <Badge variant="outline" className="bg-background">
            {enabledCount}/{flags.length} actifs
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {flags.map((flag) => (
          <FlagRow
            key={flag.id}
            flag={flag}
            onToggle={onToggle}
            onUpdateDevStatus={onUpdateDevStatus}
            isUpdating={updatingId === flag.id}
            isUpdatingDevStatus={updatingDevStatusId === flag.id}
          />
        ))}
      </CardContent>
    </Card>
  );
}

export default function AdminFeatureFlags() {
  const { data: flags, isLoading } = useFeatureFlags();
  const updateFlag = useUpdateFeatureFlag();
  const updateDevStatus = useUpdateDevStatus();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DevStatus | 'all'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updatingDevStatusId, setUpdatingDevStatusId] = useState<string | null>(null);

  const handleToggle = async (id: string, enabled: boolean) => {
    setUpdatingId(id);
    try {
      await updateFlag.mutateAsync({ id, is_enabled: enabled });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUpdateDevStatus = async (id: string, status: DevStatus) => {
    setUpdatingDevStatusId(id);
    try {
      await updateDevStatus.mutateAsync({ id, dev_status: status });
    } finally {
      setUpdatingDevStatusId(null);
    }
  };

  // Filtrer par recherche et statut
  const filteredFlags = flags?.filter(flag => {
    const matchesSearch = 
      flag.module_label.toLowerCase().includes(search.toLowerCase()) ||
      flag.module_key.toLowerCase().includes(search.toLowerCase()) ||
      flag.module_group.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || flag.dev_status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  // Grouper par groupe
  const groupedFlags = groupFlagsByGroup(filteredFlags);

  // Stats par statut dev
  const statsByDevStatus = {
    done: flags?.filter(f => f.dev_status === 'done').length || 0,
    in_progress: flags?.filter(f => f.dev_status === 'in_progress').length || 0,
    todo: flags?.filter(f => f.dev_status === 'todo').length || 0,
    disabled: flags?.filter(f => f.dev_status === 'disabled').length || 0,
  };
  const totalFlags = flags?.length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Feature Flags</h1>
        <p className="text-muted-foreground">Activer/désactiver les modules et suivre leur développement</p>
      </div>

      {/* Stats par statut de développement */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="py-3">
            <CardDescription className="flex items-center gap-1">
              <span>✅</span> Opérationnels
            </CardDescription>
            <CardTitle className="text-2xl text-green-700">{statsByDevStatus.done}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader className="py-3">
            <CardDescription className="flex items-center gap-1">
              <span>🔧</span> En cours
            </CardDescription>
            <CardTitle className="text-2xl text-orange-700">{statsByDevStatus.in_progress}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-gray-200 bg-gray-50/50">
          <CardHeader className="py-3">
            <CardDescription className="flex items-center gap-1">
              <span>⏳</span> À faire
            </CardDescription>
            <CardTitle className="text-2xl text-gray-600">{statsByDevStatus.todo}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="py-3">
            <CardDescription className="flex items-center gap-1">
              <span>🚫</span> Désactivés
            </CardDescription>
            <CardTitle className="text-2xl text-red-700">{statsByDevStatus.disabled}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="py-3">
            <CardDescription>Total modules</CardDescription>
            <CardTitle className="text-2xl">{totalFlags}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filtres : Recherche + Statut dev */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un module..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as DevStatus | 'all')}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {DEV_STATUS_OPTIONS.map((status) => {
              const config = DEV_STATUS_CONFIG[status];
              return (
                <SelectItem key={status} value={status}>
                  <span className="flex items-center gap-2">
                    <span>{config.icon}</span>
                    {config.label}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Liste des flags groupés */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {Object.entries(groupedFlags).map(([group, groupFlags]) => (
            <GroupCard
              key={group}
              group={group}
              flags={groupFlags}
              onToggle={handleToggle}
              onUpdateDevStatus={handleUpdateDevStatus}
              updatingId={updatingId}
              updatingDevStatusId={updatingDevStatusId}
            />
          ))}
          {Object.keys(groupedFlags).length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Aucun module trouvé
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
