import React, { useState } from 'react';
import { usePermissionsAuditLog, AuditLogEntry } from '@/hooks/access-rights/usePermissionsAuditLog';
import { usePermissionsBridge } from '@/hooks/usePermissionsBridge';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Download } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const ACTION_COLORS: Record<string, string> = {
  grant:               'bg-green-100 text-green-700',
  deny:                'bg-red-100 text-red-700',
  remove:              'bg-orange-100 text-orange-700',
  activate:            'bg-blue-100 text-blue-700',
  deactivate:          'bg-muted text-muted-foreground',
  update_access_level: 'bg-amber-100 text-amber-700',
  reset_to_preset:     'bg-blue-100 text-blue-700',
  bulk_apply:          'bg-purple-100 text-purple-700',
};

const ACTION_LABELS: Record<string, string> = {
  grant:               'Accordé',
  deny:                'Bloqué',
  remove:              'Retiré',
  activate:            'Activé',
  deactivate:          'Désactivé',
  update_access_level: 'Niveau modifié',
  reset_to_preset:     'Reset preset',
  bulk_apply:          'Bulk',
};

function exportCsv(entries: AuditLogEntry[]) {
  if (!entries?.length) return;
  const headers = ['Date', 'Action', 'Module', 'Cible', 'Acteur', 'Scope'];
  const rows = entries.map(e => [
    e.created_at,
    e.action_type,
    e.module_key ?? '',
    e.target_id,
    e.actor_user_id ?? '',
    e.scope_type,
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `permissions_audit_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function PermissionsAuditLogView() {
  const { isAdmin, globalRole } = usePermissionsBridge();
  const canView = isAdmin || globalRole === 'franchisee_admin';

  const [actionFilter, setActionFilter] = useState('all');
  const [moduleFilter, setModuleFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const filters = {
    action_type: actionFilter !== 'all' ? actionFilter : undefined,
    module_key: moduleFilter || undefined,
    from_date: fromDate || undefined,
    to_date: toDate || undefined,
  };

  const { data: entries = [], isLoading } = usePermissionsAuditLog(filters, 200);

  if (!canView) {
    return <p className="text-muted-foreground p-4">Accès non autorisé.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Journal des droits</h2>
          <p className="text-sm text-muted-foreground">Historique de toutes les modifications de permissions.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">V2</Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportCsv(entries)}
            disabled={!entries.length}
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            CSV
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="h-8 text-xs w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les actions</SelectItem>
            {Object.entries(ACTION_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Filtrer par module..."
          value={moduleFilter}
          onChange={e => setModuleFilter(e.target.value)}
          className="h-8 text-xs w-48"
        />

        <Input
          type="date"
          value={fromDate}
          onChange={e => setFromDate(e.target.value)}
          className="h-8 text-xs w-36"
          placeholder="Depuis"
        />

        <Input
          type="date"
          value={toDate}
          onChange={e => setToDate(e.target.value)}
          className="h-8 text-xs w-36"
          placeholder="Jusqu'au"
        />

        {(actionFilter !== 'all' || moduleFilter || fromDate || toDate) && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-8"
            onClick={() => {
              setActionFilter('all');
              setModuleFilter('');
              setFromDate('');
              setToDate('');
            }}
          >
            Réinitialiser
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Date</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Action</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Module</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Scope</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Raison</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted-foreground text-xs">
                    Aucune entrée trouvée.
                  </td>
                </tr>
              )}
              {entries.map(entry => (
                <tr key={entry.id} className="hover:bg-muted/20">
                  <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(entry.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                  </td>
                  <td className="px-3 py-2">
                    <Badge className={`text-xs ${ACTION_COLORS[entry.action_type] ?? 'bg-muted text-muted-foreground'}`}>
                      {ACTION_LABELS[entry.action_type] ?? entry.action_type}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-xs font-mono text-foreground">
                    {entry.module_key ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {entry.scope_type}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {entry.reason ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default PermissionsAuditLogView;
