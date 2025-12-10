/**
 * P2.3 - Historique des modifications de permissions
 * Affiche un placeholder - la table d'audit peut être ajoutée ultérieurement
 */

import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Crown, Layers, Shield, Clock } from 'lucide-react';

interface PermissionAuditLogProps {
  userId: string;
}

// Données simulées pour l'exemple - en production, viendrait d'une vraie table d'audit
const MOCK_ENTRIES = [
  { id: '1', action: 'role_change', date: new Date(Date.now() - 86400000 * 2), from: 'N1', to: 'N2' },
  { id: '2', action: 'module_change', date: new Date(Date.now() - 86400000 * 5), module: 'pilotage_agence' },
];

export function PermissionAuditLog({ userId }: PermissionAuditLogProps) {
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'role_change':
        return <Crown className="h-3.5 w-3.5 text-primary" />;
      case 'module_change':
        return <Layers className="h-3.5 w-3.5 text-blue-500" />;
      case 'permission_update':
        return <Shield className="h-3.5 w-3.5 text-orange-500" />;
      default:
        return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'role_change':
        return 'Changement de rôle';
      case 'module_change':
        return 'Modification module';
      default:
        return action;
    }
  };

  const formatTimeAgo = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Aujourd'hui";
    if (days === 1) return 'Hier';
    return `Il y a ${days} jours`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <History className="h-4 w-4" />
        <span>Historique des modifications</span>
      </div>
      
      <ScrollArea className="h-[200px]">
        <div className="space-y-2 pr-4">
          {MOCK_ENTRIES.map((entry) => (
            <div 
              key={entry.id} 
              className="flex items-start gap-3 p-2 rounded-md border bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="mt-0.5">
                {getActionIcon(entry.action)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{getActionLabel(entry.action)}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {formatTimeAgo(entry.date)}
                  </Badge>
                </div>
                {'from' in entry && 'to' in entry && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    <span className="line-through">{entry.from}</span>
                    {' → '}
                    <span className="text-foreground">{entry.to}</span>
                  </div>
                )}
                {'module' in entry && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Module: {entry.module}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {/* Info pour P3 */}
          <div className="mt-4 p-3 rounded-md border border-dashed bg-muted/20 text-center">
            <p className="text-xs text-muted-foreground">
              📋 Audit complet disponible dans une future version
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
