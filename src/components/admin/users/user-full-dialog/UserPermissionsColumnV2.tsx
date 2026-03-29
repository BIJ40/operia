import React, { useState } from 'react';
import { useUserPermissionsV2 } from '@/hooks/useUserPermissionsV2';
import { useUserAccessEntries, useUpsertUserAccess, useRemoveUserAccess } from '@/hooks/access-rights/useUserAccess';
import { useModuleCatalog } from '@/hooks/access-rights/useModuleCatalog';
import { SOURCE_LABELS, PermissionSource } from '@/types/permissions-v2';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Loader2, Plus, X } from 'lucide-react';

const SOURCE_COLORS: Record<PermissionSource, string> = {
  bypass:              'bg-purple-100 text-purple-700',
  is_core:             'bg-blue-100 text-blue-700',
  plan:                'bg-blue-100 text-blue-700',
  option_agence:       'bg-amber-100 text-amber-700',
  agency_delegation:   'bg-green-100 text-green-700',
  platform_assignment: 'bg-purple-100 text-purple-700',
  manual_exception:    'bg-orange-100 text-orange-700',
  auto_section:        'bg-gray-100 text-gray-500',
  not_granted:         'bg-gray-100 text-gray-400',
  pack_grant:          'bg-teal-100 text-teal-700',
  job_preset:          'bg-indigo-100 text-indigo-700',
};

const EDITABLE_SOURCES = new Set<string>([
  'manual_exception',
  'agency_delegation',
  'platform_assignment',
  'pack_grant',
  'job_preset',
]);

interface Props {
  userId: string;
  editMode: boolean;
}

export function UserPermissionsColumnV2({ userId, editMode }: Props) {
  const { data: permissions = [], isLoading: permLoad } = useUserPermissionsV2(userId);
  const { data: userAccessEntries = [], isLoading: accessLoad } = useUserAccessEntries(userId);
  const { modules } = useModuleCatalog();
  const upsert = useUpsertUserAccess();
  const remove = useRemoveUserAccess();

  const [addOpen, setAddOpen] = useState(false);

  const isLoading = permLoad || accessLoad;

  // Permissions accordées uniquement (granted = true), hors sections décoratives
  const granted = permissions.filter(
    p => p.granted && p.node_type !== 'section' && p.source_summary !== 'auto_section'
  );

  // Modules déjà dans user_access (éditable)
  const accessMap = new Map(userAccessEntries.map(e => [e.module_key, e]));

  // Modules disponibles à ajouter (déployés, non déjà accordés)
  const available = modules.filter(
    m => m.is_deployed &&
      m.via_user_assignment === true &&
      m.min_role < 5 &&
      !granted.find(g => g.module_key === m.key)
  );

  if (isLoading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Permissions résolues</h3>
        <Badge variant="outline" className="text-[10px]">V2</Badge>
      </div>

      {/* Liste des permissions accordées */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="text-left p-2 font-medium text-muted-foreground">Module</th>
              <th className="text-left p-2 font-medium text-muted-foreground w-20">Accès</th>
              <th className="text-left p-2 font-medium text-muted-foreground w-28">Source</th>
              {editMode && (
                <th className="w-8 p-2"></th>
              )}
            </tr>
          </thead>
          <tbody>
            {granted.length === 0 && (
              <tr>
                <td colSpan={editMode ? 4 : 3} className="p-4 text-center text-muted-foreground">
                  Aucun module accordé
                </td>
              </tr>
            )}
            {granted.map(perm => {
              const isEditable = EDITABLE_SOURCES.has(perm.source_summary);

              return (
                <tr key={perm.module_key} className="border-b last:border-b-0 hover:bg-muted/30">
                  <td className="p-2">
                    <div>
                      <span className="font-medium text-foreground">
                        {modules.find(m => m.key === perm.module_key)?.label ?? perm.module_key}
                      </span>
                      <span className="block text-[10px] text-muted-foreground">{perm.module_key}</span>
                    </div>
                  </td>
                  <td className="p-2">
                    {editMode && isEditable ? (
                      <Select
                        value={perm.access_level}
                        onValueChange={(v) =>
                          upsert.mutate({
                            user_id: userId,
                            module_key: perm.module_key,
                            granted: true,
                            access_level: v as 'none' | 'read' | 'full',
                          })
                        }
                      >
                        <SelectTrigger className="h-6 text-[10px] w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="read">Lecture</SelectItem>
                          <SelectItem value="full">Complet</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-muted-foreground">
                        {perm.access_level === 'full' ? 'Complet' :
                         perm.access_level === 'read' ? 'Lecture' : 'Aucun'}
                      </span>
                    )}
                  </td>
                  <td className="p-2">
                    <Badge
                      variant="secondary"
                      className={`text-[10px] ${SOURCE_COLORS[perm.source_summary as PermissionSource] ?? ''}`}
                    >
                      {SOURCE_LABELS[perm.source_summary as PermissionSource] ?? perm.source_summary}
                    </Badge>
                  </td>
                  {editMode && (
                    <td className="p-2">
                      {isEditable && (
                        <button
                          onClick={() =>
                            remove.mutate({ user_id: userId, module_key: perm.module_key })
                          }
                          className="text-muted-foreground/30 hover:text-destructive transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bouton ajouter un module */}
      {editMode && (
        <Popover open={addOpen} onOpenChange={setAddOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="mt-3 w-full gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" />
              Ajouter un module
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <Command>
              <CommandInput placeholder="Rechercher..." className="text-xs" />
              <CommandEmpty className="text-xs p-2">
                Aucun module disponible.
              </CommandEmpty>
              <CommandGroup className="max-h-48 overflow-y-auto">
                {available.map(mod => (
                  <CommandItem
                    key={mod.key}
                    value={mod.label}
                    onSelect={() => {
                      upsert.mutate({
                        user_id: userId,
                        module_key: mod.key,
                        granted: true,
                        access_level: 'full',
                      });
                      setAddOpen(false);
                    }}
                    className="text-xs"
                  >
                    <div>
                      <span className="font-medium">{mod.label}</span>
                      <span className="block text-[10px] text-muted-foreground">{mod.key}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

export default UserPermissionsColumnV2;
