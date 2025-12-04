import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  FileText, Upload, Trash2, Eye, Edit, Lock, Unlock, 
  FileCheck, User, Sparkles, Clock
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  RHAuditLogEntry, 
  RHAuditActionType,
  formatActionType 
} from '@/hooks/rh/useRHAuditLog';

interface RHAuditLogTableProps {
  entries: RHAuditLogEntry[];
  showCollaborator?: boolean;
}

function getActionIcon(action: RHAuditActionType) {
  const icons: Record<string, React.ReactNode> = {
    DOCUMENT_UPLOAD: <Upload className="w-4 h-4 text-green-600" />,
    DOCUMENT_DELETE: <Trash2 className="w-4 h-4 text-red-600" />,
    DOCUMENT_UPDATE: <Edit className="w-4 h-4 text-blue-600" />,
    DOCUMENT_VIEW: <Eye className="w-4 h-4 text-gray-600" />,
    REQUEST_CREATE: <FileText className="w-4 h-4 text-helpconfort-blue" />,
    REQUEST_UPDATE: <FileCheck className="w-4 h-4 text-helpconfort-orange" />,
    REQUEST_LOCK: <Lock className="w-4 h-4 text-amber-600" />,
    REQUEST_UNLOCK: <Unlock className="w-4 h-4 text-green-600" />,
    CONTRACT_CREATE: <FileText className="w-4 h-4 text-green-600" />,
    CONTRACT_UPDATE: <Edit className="w-4 h-4 text-blue-600" />,
    CONTRACT_DELETE: <Trash2 className="w-4 h-4 text-red-600" />,
    SALARY_CREATE: <FileText className="w-4 h-4 text-green-600" />,
    SALARY_UPDATE: <Edit className="w-4 h-4 text-blue-600" />,
    SALARY_DELETE: <Trash2 className="w-4 h-4 text-red-600" />,
    COLLABORATOR_CREATE: <User className="w-4 h-4 text-green-600" />,
    COLLABORATOR_UPDATE: <User className="w-4 h-4 text-blue-600" />,
    PAYSLIP_ANALYZE: <Sparkles className="w-4 h-4 text-violet-600" />,
  };
  return icons[action] || <Clock className="w-4 h-4" />;
}

function getActionBadgeVariant(action: RHAuditActionType): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (action.includes('DELETE')) return 'destructive';
  if (action.includes('CREATE') || action.includes('UPLOAD')) return 'default';
  if (action.includes('UPDATE') || action.includes('LOCK')) return 'secondary';
  return 'outline';
}

export function RHAuditLogTable({ entries, showCollaborator = true }: RHAuditLogTableProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Aucune action enregistrée
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">Date</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Utilisateur</TableHead>
            {showCollaborator && <TableHead>Collaborateur</TableHead>}
            <TableHead>Détails</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="text-sm text-muted-foreground">
                {format(new Date(entry.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {getActionIcon(entry.action_type)}
                  <Badge variant={getActionBadgeVariant(entry.action_type)}>
                    {formatActionType(entry.action_type)}
                  </Badge>
                </div>
              </TableCell>
              <TableCell>
                {entry.user ? (
                  <span className="text-sm">
                    {entry.user.first_name} {entry.user.last_name}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-sm">-</span>
                )}
              </TableCell>
              {showCollaborator && (
                <TableCell>
                  {entry.collaborator ? (
                    <span className="text-sm">
                      {entry.collaborator.first_name} {entry.collaborator.last_name}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
              )}
              <TableCell className="max-w-[200px]">
                {entry.metadata && (
                  <span className="text-xs text-muted-foreground truncate block">
                    {entry.metadata.filename && `Fichier: ${entry.metadata.filename}`}
                    {entry.metadata.status && `Statut: ${entry.metadata.status}`}
                    {entry.metadata.request_type && `Type: ${entry.metadata.request_type}`}
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
