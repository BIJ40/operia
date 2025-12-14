/**
 * Onglet Historique - Journal des modifications de permissions
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { History, Search, User, Building2, Layers, Settings } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissionAudit } from '@/hooks/access-rights';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';

const ACTION_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  'change_plan': { label: 'Changement de plan', color: 'bg-blue-500', icon: <Layers className="h-3 w-3" /> },
  'enable_plan_module': { label: 'Module activé', color: 'bg-green-500', icon: <Layers className="h-3 w-3" /> },
  'disable_plan_module': { label: 'Module désactivé', color: 'bg-orange-500', icon: <Layers className="h-3 w-3" /> },
  'update_user_role': { label: 'Rôle modifié', color: 'bg-purple-500', icon: <User className="h-3 w-3" /> },
  'create_user': { label: 'Utilisateur créé', color: 'bg-green-500', icon: <User className="h-3 w-3" /> },
  'deactivate_user': { label: 'Utilisateur désactivé', color: 'bg-red-500', icon: <User className="h-3 w-3" /> },
  'assign_agency': { label: 'Agence assignée', color: 'bg-teal-500', icon: <Building2 className="h-3 w-3" /> },
  'update_modules': { label: 'Modules modifiés', color: 'bg-indigo-500', icon: <Settings className="h-3 w-3" /> },
};

const ENTITY_LABELS: Record<string, string> = {
  'user': 'Utilisateur',
  'subscription': 'Souscription',
  'plan_tier_module': 'Module de plan',
  'agency': 'Agence',
  'scope': 'Périmètre',
};

export function AuditHistoryTab() {
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const { data: auditEntries, isLoading } = usePermissionAudit({
    entityType: entityFilter !== 'all' ? entityFilter : undefined,
    limit: 100,
  });

  const getActionDisplay = (action: string) => {
    return ACTION_LABELS[action] || { 
      label: action, 
      color: 'bg-muted', 
      icon: <Settings className="h-3 w-3" /> 
    };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Historique des Modifications
        </CardTitle>
        <CardDescription>
          Journal d'audit de toutes les actions sur les droits et accès
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtres */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Type d'entité" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les entités</SelectItem>
              {Object.entries(ENTITY_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Timeline */}
        <ScrollArea className="h-[500px] pr-4">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : auditEntries?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune entrée dans l'historique</p>
            </div>
          ) : (
            <div className="space-y-4">
              {auditEntries?.map((entry, index) => {
                const actionDisplay = getActionDisplay(entry.action);
                const editorName = entry.editor 
                  ? `${entry.editor.first_name || ''} ${entry.editor.last_name || ''}`.trim() || entry.editor.email
                  : 'Système';
                const targetName = entry.target 
                  ? `${entry.target.first_name || ''} ${entry.target.last_name || ''}`.trim() || entry.target.email
                  : null;
                
                return (
                  <div 
                    key={entry.id} 
                    className="flex gap-4 relative"
                  >
                    {/* Timeline line */}
                    {index < (auditEntries?.length ?? 0) - 1 && (
                      <div className="absolute left-5 top-10 bottom-0 w-px bg-border" />
                    )}
                    
                    {/* Icon */}
                    <div className={`h-10 w-10 rounded-full ${actionDisplay.color} flex items-center justify-center text-white shrink-0 z-10`}>
                      {actionDisplay.icon}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 pb-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">
                            {actionDisplay.label}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            par <span className="font-medium text-foreground">{editorName}</span>
                            {targetName && (
                              <> sur <span className="font-medium text-foreground">{targetName}</span></>
                            )}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(entry.created_at), { 
                              addSuffix: true, 
                              locale: fr 
                            })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(entry.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                          </div>
                        </div>
                      </div>
                      
                      {/* Changes */}
                      {entry.changes && Object.keys(entry.changes).length > 0 && (
                        <div className="mt-2 p-2 bg-muted/50 rounded text-xs font-mono">
                          {Object.entries(entry.changes).map(([key, value]) => (
                            <div key={key}>
                              <span className="text-muted-foreground">{key}:</span>{' '}
                              <span className="text-foreground">
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Entity badge */}
                      <div className="mt-2">
                        <Badge variant="outline" className="text-xs">
                          {ENTITY_LABELS[entry.entity_type] || entry.entity_type}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        
        <div className="text-sm text-muted-foreground border-t pt-4">
          {auditEntries?.length || 0} entrée(s) affichée(s)
        </div>
      </CardContent>
    </Card>
  );
}
