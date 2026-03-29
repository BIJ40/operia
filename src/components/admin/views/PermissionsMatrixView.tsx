import React, { useState, useEffect } from 'react';
import { usePermissionsBridge } from '@/hooks/usePermissionsBridge';
import { useModuleCatalog } from '@/hooks/access-rights/useModuleCatalog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Shield, ShieldCheck, ShieldX, Sparkles } from 'lucide-react';
import { AdminViewHeader } from '@/components/admin/shared/AdminViewHeader';
import { AdminPanel } from '@/components/admin/shared/AdminPanel';
import { SOURCE_LABELS, PermissionSource } from '@/types/permissions-v2';

const CATEGORY_ORDER = ['accueil', 'pilotage', 'commercial', 'organisation', 'mediatheque', 'support', 'ticketing', 'admin'];

const CATEGORY_STYLES: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  accueil:      { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', icon: '🏠' },
  pilotage:     { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: '📊' },
  commercial:   { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: '💼' },
  organisation: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: '🗂️' },
  mediatheque:  { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700', icon: '📚' },
  support:      { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', icon: '🛟' },
  ticketing:    { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: '🎫' },
  admin:        { bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-700', icon: '⚙️' },
};

interface AgencyUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  global_role: string | null;
}

interface UserPermRow {
  module_key: string;
  granted: boolean;
  access_level: string;
  source_summary: string;
}

function useAgencyUsers(agencyId: string | null) {
  return useQuery({
    queryKey: ['agency_users_matrix', agencyId],
    enabled: !!agencyId,
    queryFn: async (): Promise<AgencyUser[]> => {
      if (!agencyId) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id,first_name,last_name,email,global_role')
        .eq('agency_id', agencyId)
        .order('last_name');
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useUserPermissionsForMatrix(userId: string | null) {
  return useQuery({
    queryKey: ['user_perms_matrix', userId],
    enabled: !!userId,
    queryFn: async (): Promise<UserPermRow[]> => {
      if (!userId) return [];
      const { data, error } = await supabase.rpc('get_user_permissions', {
        p_user_id: userId,
      });
      if (error) throw error;
      return (data as UserPermRow[]) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

function CellIcon({ granted, source }: { granted: boolean; source: string }) {
  if (!granted || source === 'not_granted') {
    return <ShieldX className="w-5 h-5 text-destructive/30 mx-auto" />;
  }
  if (source === 'plan' || source === 'is_core') {
    return <ShieldCheck className="w-5 h-5 text-primary mx-auto" />;
  }
  if (source === 'option_agence') {
    return <ShieldCheck className="w-5 h-5 text-amber-500 mx-auto" />;
  }
  if (source === 'agency_delegation' || source === 'manual_exception') {
    return <Sparkles className="w-5 h-5 text-emerald-500 mx-auto" />;
  }
  return <Shield className="w-5 h-5 text-muted-foreground/40 mx-auto" />;
}

export function PermissionsMatrixView() {
  const { isAdmin, globalRole } = usePermissionsBridge();
  const { modules } = useModuleCatalog();
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null);
  const [agencies, setAgencies] = useState<{ id: string; label: string }[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data: users = [], isLoading: usersLoading } = useAgencyUsers(selectedAgencyId);
  const { data: perms = [], isLoading: permsLoading } = useUserPermissionsForMatrix(selectedUserId);

  const deployedModules = modules.filter(m => m.is_deployed && m.node_type !== 'section');

  const permMap = new Map(perms.map(p => [p.module_key, p]));

  useEffect(() => {
    supabase
      .from('apogee_agencies')
      .select('id, label')
      .eq('is_active', true)
      .order('label')
      .limit(200)
      .then(({ data }) => setAgencies(data ?? []));
  }, []);

  const canView = isAdmin || globalRole === 'franchisee_admin';

  if (!canView) {
    return <p className="text-muted-foreground p-4">Accès non autorisé.</p>;
  }

  return (
    <div className="space-y-6">
      <AdminViewHeader
        title="Matrice des droits"
        subtitle="Droits résolus par utilisateur sur tous les modules."
      />

      <AdminPanel>
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Select
              value={selectedAgencyId ?? 'none'}
              onValueChange={v => {
                setSelectedAgencyId(v === 'none' ? null : v);
                setSelectedUserId(null);
              }}
            >
              <SelectTrigger className="w-full sm:w-[250px]">
                <SelectValue placeholder="Sélectionner une agence..." />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="none">Sélectionner une agence...</SelectItem>
                {agencies.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedAgencyId && (
          <Select
            value={selectedUserId ?? 'none'}
            onValueChange={v => setSelectedUserId(v === 'none' ? null : v)}
            disabled={usersLoading}
          >
            <SelectTrigger className="w-full sm:w-[250px]">
              <SelectValue placeholder="Sélectionner un utilisateur..." />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="none">Sélectionner un utilisateur...</SelectItem>
              {users.map(u => {
                const displayName = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email || u.id;
                return (
                  <SelectItem key={u.id} value={u.id}>{displayName}</SelectItem>
                );
              })}
            </SelectContent>
          </Select>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 rounded-lg bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><ShieldCheck className="w-4 h-4 text-primary" /> Plan / Socle</span>
            <span className="flex items-center gap-1"><ShieldCheck className="w-4 h-4 text-amber-500" /> Option agence</span>
            <span className="flex items-center gap-1"><Sparkles className="w-4 h-4 text-emerald-500" /> Individuel / Exception</span>
            <span className="flex items-center gap-1"><ShieldX className="w-4 h-4 text-destructive/30" /> Non accordé</span>
          </div>
        </div>
      </AdminPanel>

      {!selectedUserId && (
        <AdminPanel className="flex min-h-[180px] items-center justify-center text-center text-sm text-muted-foreground">
          Sélectionnez une agence puis un utilisateur.
        </AdminPanel>
      )}

      {selectedUserId && permsLoading && (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {selectedUserId && !permsLoading && (
        <AdminPanel padding="none" className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Module</th>
                <th className="text-center px-3 py-2 text-xs font-medium text-muted-foreground">Accès</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Source</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Niveau</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const byCategory = deployedModules.reduce<Record<string, typeof deployedModules>>(
                  (acc, m) => {
                    const cat = m.category ?? 'Autre';
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(m);
                    return acc;
                  },
                  {}
                );
                const sortedCategories = Object.entries(byCategory).sort(([a], [b]) => {
                  const ia = CATEGORY_ORDER.indexOf(a);
                  const ib = CATEGORY_ORDER.indexOf(b);
                  if (ia === -1 && ib === -1) return a.localeCompare(b);
                  if (ia === -1) return 1;
                  if (ib === -1) return -1;
                  return ia - ib;
                });
                return sortedCategories.map(([category, mods]) => {
                  const style = CATEGORY_STYLES[category] ?? { bg: 'bg-muted/30', border: 'border-border', text: 'text-muted-foreground', icon: '📦' };
                  return (
                    <React.Fragment key={category}>
                      <tr className={`${style.bg} ${style.border} border-b border-t`}>
                        <td colSpan={4} className={`py-2.5 px-4 text-xs font-bold ${style.text} uppercase tracking-widest`}>
                          <span className="mr-2 text-sm">{style.icon}</span>
                          {category}
                        </td>
                      </tr>
                      {mods.map(mod => {
                        const perm = permMap.get(mod.key);
                        const granted = perm?.granted ?? false;
                        const source = perm?.source_summary ?? 'not_granted';
                        const level = perm?.access_level ?? 'none';

                        return (
                          <tr
                            key={mod.key}
                            className={`border-b border-border/50 transition-all hover:bg-muted/30 ${
                              granted ? '' : 'opacity-45'
                            }`}
                          >
                            <td className="py-2.5 px-4">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-sm font-semibold text-foreground">{mod.label}</span>
                                <span className="text-[10px] text-muted-foreground/60 font-mono">{mod.key}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <CellIcon granted={granted} source={source} />
                            </td>
                            <td className="py-2.5 px-3">
                              {granted && source !== 'not_granted' ? (
                                <span className="text-xs font-medium text-foreground/70">
                                  {SOURCE_LABELS[source as PermissionSource] ?? source}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground/40">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {granted && level !== 'none' ? (
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] font-semibold ${
                                    level === 'full'
                                      ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
                                      : 'border-sky-300 text-sky-700 bg-sky-50'
                                  }`}
                                >
                                  {level === 'full' ? '● Complet' : '◐ Lecture'}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground/40">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                });
              })()}
            </tbody>
          </table>
        </AdminPanel>
      )}
    </div>
  );
}

export default PermissionsMatrixView;
