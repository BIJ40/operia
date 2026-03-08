/**
 * Composant Timeline d'activité réutilisable
 * Affiche l'historique des actions sur une entité, un module ou une agence
 */

import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  User, 
  Bot, 
  Settings, 
  UserCircle,
  Plus,
  Pencil,
  Trash2,
  Eye,
  LogIn,
  LogOut,
  RefreshCw,
  Download,
  Upload
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ActivityLogEntry,
  ActivityActorType,
  formatAction,
  formatModule,
  formatEntityType,
  formatActorType,
} from '@/hooks/useActivityLog';

interface ActivityTimelineProps {
  entries: ActivityLogEntry[];
  isLoading?: boolean;
  showModule?: boolean;
  showEntityType?: boolean;
  maxHeight?: string;
  emptyMessage?: string;
  className?: string;
}

function getActionIcon(action: string) {
  switch (action) {
    case 'CREATE':
      return <Plus className="h-3.5 w-3.5" />;
    case 'UPDATE':
      return <Pencil className="h-3.5 w-3.5" />;
    case 'DELETE':
      return <Trash2 className="h-3.5 w-3.5" />;
    case 'VIEW':
      return <Eye className="h-3.5 w-3.5" />;
    case 'LOGIN':
      return <LogIn className="h-3.5 w-3.5" />;
    case 'LOGOUT':
      return <LogOut className="h-3.5 w-3.5" />;
    case 'SYNC':
      return <RefreshCw className="h-3.5 w-3.5" />;
    case 'EXPORT':
      return <Download className="h-3.5 w-3.5" />;
    case 'IMPORT':
      return <Upload className="h-3.5 w-3.5" />;
    default:
      return <Settings className="h-3.5 w-3.5" />;
  }
}

function getActorIcon(actorType: ActivityActorType) {
  switch (actorType) {
    case 'user':
      return <User className="h-4 w-4" />;
    case 'apporteur':
      return <UserCircle className="h-4 w-4" />;
    case 'system':
      return <Settings className="h-4 w-4" />;
    case 'ai':
      return <Bot className="h-4 w-4" />;
    default:
      return <User className="h-4 w-4" />;
  }
}

function getActionColor(action: string): string {
  switch (action) {
    case 'CREATE':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'UPDATE':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'DELETE':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    case 'VIEW':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    case 'LOGIN':
    case 'LOGOUT':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    case 'SYNC':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function ActivityTimelineItem({ 
  entry, 
  showModule, 
  showEntityType,
  isLast 
}: { 
  entry: ActivityLogEntry; 
  showModule?: boolean;
  showEntityType?: boolean;
  isLast: boolean;
}) {
  const timeAgo = formatDistanceToNow(new Date(entry.created_at), { 
    addSuffix: true, 
    locale: fr 
  });
  const fullDate = format(new Date(entry.created_at), "dd/MM/yyyy à HH:mm:ss", { locale: fr });

  return (
    <div className="relative flex gap-3 pb-4">
      {/* Timeline connector */}
      {!isLast && (
        <div className="absolute left-[15px] top-8 h-full w-px bg-border" />
      )}
      
      {/* Actor icon */}
      <div className={cn(
        "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background",
        entry.actor_type === 'system' && "bg-muted",
        entry.actor_type === 'ai' && "bg-primary/10 border-primary/30"
      )}>
        {getActorIcon(entry.actor_type as any)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Action badge */}
          <span className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium",
            getActionColor(entry.action)
          )}>
            {getActionIcon(entry.action)}
            {formatAction(entry.action)}
          </span>

          {/* Module badge */}
          {showModule && (
            <Badge variant="outline" className="text-xs">
              {formatModule(entry.module)}
            </Badge>
          )}

          {/* Entity type */}
          {showEntityType && (
            <span className="text-xs text-muted-foreground">
              {formatEntityType(entry.entity_type)}
            </span>
          )}
        </div>

        {/* Entity label */}
        {entry.entity_label && (
          <p className="text-sm font-medium truncate">
            {entry.entity_label}
          </p>
        )}

        {/* Timestamp */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-xs text-muted-foreground cursor-help">
                {formatActorType(entry.actor_type as any)} • {timeAgo}
              </p>
            </TooltipTrigger>
            <TooltipContent>
              <p>{fullDate}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

function ActivityTimelineSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ActivityTimeline({
  entries,
  isLoading,
  showModule = false,
  showEntityType = true,
  maxHeight = '400px',
  emptyMessage = 'Aucune activité enregistrée',
  className,
}: ActivityTimelineProps) {
  if (isLoading) {
    return (
      <div className={cn("p-4", className)}>
        <ActivityTimelineSkeleton />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className={cn("flex items-center justify-center p-8 text-muted-foreground text-sm", className)}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <ScrollArea className={className} style={{ maxHeight }}>
      <div className="p-4">
        {entries.map((entry, index) => (
          <ActivityTimelineItem
            key={entry.id}
            entry={entry}
            showModule={showModule}
            showEntityType={showEntityType}
            isLast={index === entries.length - 1}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

export default ActivityTimeline;
