import React, { useState, useEffect } from 'react';
import { usePermissionsBridge } from '@/hooks/usePermissionsBridge';
import { useModuleCatalog } from '@/hooks/access-rights/useModuleCatalog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { SOURCE_LABELS, PermissionSource } from '@/types/permissions-v2';

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
    return <span className="text-destructive/40">✗</span>;
  }
  if (source === 'plan' || source === 'is_core') {
    return <span className="text-primary">✓</span>;
  }
  if (source === 'option_agence') {
    return <span className="text-amber-500">✓</span>;
  }
  if (source === 'agency_delegation' || source === 'manual_exception') {
    return <span className="text-green-500">✓</span>;
  }
  return <span className="text-muted-foreground">○</span>;
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Matrice des droits</h2>
          <p className="text-sm text-muted-foreground">Droits résolus par utilisateur sur tous les modules.</p>
        </div>
        <Badge variant="outline" className="text-xs">V2</Badge>
      </div>

      {/* Sélecteurs */}
      <div className="flex items-center gap-3">
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
          value={selectedAgencyId ?? ''}
          onChange={e => {
            setSelectedAgencyId(e.target.value || null);
            setSelectedUserId(null);
          }}
        >
          <option value="">Sélectionner une agence...</option>
          {agencies.map(a => (
            <option key={a.id} value={a.id}>{a.label}</option>
          ))}
        </select>

        {selectedAgencyId && (
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
            value={selectedUserId ?? ''}
            onChange={e => setSelectedUserId(e.target.value || null)}
            disabled={usersLoading}
          >
            <option value="">Sélectionner un utilisateur...</option>
            {users.map(u => {
              const displayName = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email || u.id;
              return (
                <option key={u.id} value={u.id}>{displayName}</option>
              );
            })}
          </select>
        )}
      </div>

      {/* Légende */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span><span className="text-primary">✓</span> Plan / Socle</span>
        <span><span className="text-amber-500">✓</span> Option agence</span>
        <span><span className="text-green-500">✓</span> Individuel / Exception</span>
        <span><span className="text-destructive/40">✗</span> Non accordé</span>
      </div>

      {!selectedUserId && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Sélectionnez une agence puis un utilisateur.
        </div>
      )}

      {selectedUserId && permsLoading && (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {selectedUserId && !permsLoading && (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Module</th>
                <th className="text-center px-3 py-2 text-xs font-medium text-muted-foreground">Accès</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Source</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Niveau</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Object.entries(
                deployedModules.reduce<Record<string, typeof deployedModules>>(
                  (acc, m) => {
                    const cat = m.category ?? 'Autre';
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(m);
                    return acc;
                  },
                  {}
                )
              ).map(([category, mods]) => (
                <React.Fragment key={category}>
                  <tr className="bg-muted/30 border-b border-t">
                    <td colSpan={4} className="py-1 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {category}
                    </td>
                  </tr>
                  {mods.map(mod => {
                    const perm = permMap.get(mod.key);
                    const granted = perm?.granted ?? false;
                    const source = perm?.source_summary ?? 'not_granted';
                    const level = perm?.access_level ?? 'none';

                    return (
                      <tr key={mod.key} className="hover:bg-muted/20">
                        <td className="px-3 py-2">
                          <div>
                            <span className="text-foreground text-xs font-medium">{mod.label}</span>
                            <span className="text-muted-foreground text-xs ml-1.5 font-mono">{mod.key}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <CellIcon granted={granted} source={source} />
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {granted && source !== 'not_granted'
                            ? SOURCE_LABELS[source as PermissionSource] ?? source
                            : '—'}
                        </td>
                        <td className="px-3 py-2">
                          {granted && level !== 'none' ? (
                            <Badge variant="outline" className="text-xs">
                              {level === 'full' ? 'Complet' : level === 'read' ? 'Lecture' : '—'}
                            </Badge>
                          ) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default PermissionsMatrixView;
