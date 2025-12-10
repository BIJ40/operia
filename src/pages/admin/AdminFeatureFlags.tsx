/**
 * Page d'administration des Feature Flags
 * Permet d'activer/désactiver les modules dynamiquement
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { ToggleLeft, Search, Info } from 'lucide-react';
import {
  useFeatureFlags,
  useUpdateFeatureFlag,
  groupFlagsByGroup,
  MODULE_GROUP_LABELS,
  type FeatureFlag,
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
import { PageHeader } from '@/components/layout/PageHeader';

const GROUP_COLORS: Record<string, string> = {
  rh: 'bg-violet-500/10 text-violet-700 border-violet-200',
  pilotage: 'bg-blue-500/10 text-blue-700 border-blue-200',
  support: 'bg-green-500/10 text-green-700 border-green-200',
  academy: 'bg-amber-500/10 text-amber-700 border-amber-200',
  reseau: 'bg-rose-500/10 text-rose-700 border-rose-200',
  commercial: 'bg-cyan-500/10 text-cyan-700 border-cyan-200',
  admin: 'bg-slate-500/10 text-slate-700 border-slate-200',
};

function FlagRow({ flag, onToggle, isUpdating }: { 
  flag: FeatureFlag; 
  onToggle: (id: string, enabled: boolean) => void;
  isUpdating: boolean;
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
  updatingId 
}: { 
  group: string; 
  flags: FeatureFlag[];
  onToggle: (id: string, enabled: boolean) => void;
  updatingId: string | null;
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
            isUpdating={updatingId === flag.id}
          />
        ))}
      </CardContent>
    </Card>
  );
}

export default function AdminFeatureFlags() {
  const { data: flags, isLoading } = useFeatureFlags();
  const updateFlag = useUpdateFeatureFlag();
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleToggle = async (id: string, enabled: boolean) => {
    setUpdatingId(id);
    try {
      await updateFlag.mutateAsync({ id, is_enabled: enabled });
    } finally {
      setUpdatingId(null);
    }
  };

  // Filtrer par recherche
  const filteredFlags = flags?.filter(flag => 
    flag.module_label.toLowerCase().includes(search.toLowerCase()) ||
    flag.module_key.toLowerCase().includes(search.toLowerCase()) ||
    flag.module_group.toLowerCase().includes(search.toLowerCase())
  ) || [];

  // Grouper par groupe
  const groupedFlags = groupFlagsByGroup(filteredFlags);

  // Stats
  const totalEnabled = flags?.filter(f => f.is_enabled).length || 0;
  const totalFlags = flags?.length || 0;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Feature Flags"
        subtitle="Activer ou désactiver les modules de l'application"
        backTo="/admin"
        backLabel="Administration"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="py-3">
            <CardDescription>Modules actifs</CardDescription>
            <CardTitle className="text-2xl text-green-600">{totalEnabled}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="py-3">
            <CardDescription>Modules désactivés</CardDescription>
            <CardTitle className="text-2xl text-muted-foreground">{totalFlags - totalEnabled}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="py-3">
            <CardDescription>Total modules</CardDescription>
            <CardTitle className="text-2xl">{totalFlags}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un module..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
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
              updatingId={updatingId}
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
