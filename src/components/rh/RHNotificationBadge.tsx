import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRHNotifications, useUnreadRHNotificationsCount, useMarkRHNotificationsRead, useMarkAllRHNotificationsRead, type RHNotification } from '@/hooks/rh/useRHNotifications';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/config/routes';
import { FileText, CheckCircle, XCircle, Clock, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const notificationIcons: Record<string, React.ElementType> = {
  REQUEST_CREATED: Plus,
  REQUEST_COMPLETED: CheckCircle,
  REQUEST_REJECTED: XCircle,
  DOCUMENT_ADDED: FileText,
  REQUEST_IN_PROGRESS: Clock,
};

const notificationColors: Record<string, string> = {
  REQUEST_CREATED: 'text-helpconfort-blue',
  REQUEST_COMPLETED: 'text-green-600',
  REQUEST_REJECTED: 'text-red-600',
  DOCUMENT_ADDED: 'text-helpconfort-orange',
  REQUEST_IN_PROGRESS: 'text-amber-600',
};

interface RHNotificationItemProps {
  notification: RHNotification;
  onMarkRead: (id: string) => void;
  onClick: () => void;
}

function RHNotificationItem({ notification, onMarkRead, onClick }: RHNotificationItemProps) {
  const Icon = notificationIcons[notification.notification_type] || Bell;
  const colorClass = notificationColors[notification.notification_type] || 'text-muted-foreground';

  return (
    <button
      className={cn(
        'w-full text-left p-3 hover:bg-muted/50 transition-colors border-b last:border-b-0',
        !notification.is_read && 'bg-helpconfort-blue/5'
      )}
      onClick={() => {
        if (!notification.is_read) {
          onMarkRead(notification.id);
        }
        onClick();
      }}
    >
      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5', colorClass)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={cn(
              'text-sm truncate',
              !notification.is_read && 'font-medium'
            )}>
              {notification.title}
            </p>
            {!notification.is_read && (
              <span className="h-2 w-2 rounded-full bg-helpconfort-blue flex-shrink-0" />
            )}
          </div>
          {notification.message && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
              {notification.message}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(notification.created_at), {
              addSuffix: true,
              locale: fr,
            })}
          </p>
        </div>
      </div>
    </button>
  );
}

export function RHNotificationBadge() {
  const navigate = useNavigate();
  const { globalRole } = useAuth();
  const { data: notifications = [], isLoading } = useRHNotifications();
  const { data: unreadCount = 0 } = useUnreadRHNotificationsCount();
  const markRead = useMarkRHNotificationsRead();
  const markAllRead = useMarkAllRHNotificationsRead();

  // Déterminer si l'utilisateur est RH (N2+) ou salarié
  const isRH = globalRole && ['franchisee_admin', 'franchisor_user', 'franchisor_admin', 'platform_admin', 'superadmin'].includes(globalRole);

  const handleNotificationClick = (notification: RHNotification) => {
    // Naviguer selon le type
    if (notification.notification_type === 'REQUEST_CREATED') {
      // Pour les RH: aller aux demandes
      navigate(ROUTES.rh.demandes);
    } else if (notification.notification_type === 'REQUEST_COMPLETED' || notification.notification_type === 'REQUEST_REJECTED') {
      // Pour les salariés: aller à mes demandes
      navigate(ROUTES.rh.demande);
    } else if (notification.related_document_id) {
      // Pour les salariés: aller au coffre-fort
      navigate(ROUTES.rh.coffre);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 text-xs flex items-center justify-center"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-background z-50" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-semibold text-sm">Notifications RH</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => markAllRead.mutate()}
            >
              Tout marquer lu
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Chargement...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Aucune notification</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <RHNotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={(id) => markRead.mutate([id])}
                onClick={() => handleNotificationClick(notification)}
              />
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
