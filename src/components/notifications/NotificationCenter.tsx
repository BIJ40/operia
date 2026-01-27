import { useState } from "react";
import { Bell, Check, CheckCheck, Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import {
  useUnifiedNotifications,
  useUnreadNotificationsCount,
  useMarkNotificationsRead,
  useMarkAllNotificationsRead,
  type UnifiedNotification,
} from "@/hooks/useUnifiedNotifications";
import { cn } from "@/lib/utils";

const categoryColors: Record<string, string> = {
  support: "bg-primary",
  epi: "bg-orange-500",
  rh: "bg-emerald-500",
  system: "bg-muted-foreground",
  apogee: "bg-violet-500",
};

const categoryLabels: Record<string, string> = {
  support: "Support",
  epi: "EPI",
  rh: "RH",
  system: "Système",
  apogee: "Apogée",
};

function NotificationItem({
  notification,
  onRead,
  onNavigate,
}: {
  notification: UnifiedNotification;
  onRead: (id: string) => void;
  onNavigate: (url: string) => void;
}) {
  const handleClick = () => {
    if (!notification.is_read) {
      onRead(notification.id);
    }
    if (notification.action_url) {
      onNavigate(notification.action_url);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "p-3 border-b last:border-0 cursor-pointer transition-colors hover:bg-muted/50",
        !notification.is_read && "bg-primary/5"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <Badge
            variant="secondary"
            className={cn(
              "text-white text-[10px] px-1.5 py-0.5",
              categoryColors[notification.category] || "bg-gray-500"
            )}
          >
            {categoryLabels[notification.category] || notification.category}
          </Badge>
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm truncate",
              !notification.is_read && "font-medium"
            )}
          >
            {notification.title}
          </p>
          {notification.message && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
              {notification.message}
            </p>
          )}
          <p className="text-[10px] text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(notification.created_at), {
              addSuffix: true,
              locale: fr,
            })}
          </p>
        </div>
        {!notification.is_read && (
          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
        )}
      </div>
    </div>
  );
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  
  const { data: notifications = [], isLoading } = useUnifiedNotifications();
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();
  const markRead = useMarkNotificationsRead();
  const markAllRead = useMarkAllNotificationsRead();

  const handleRead = (id: string) => {
    markRead.mutate([id]);
  };

  const handleNavigate = (url: string) => {
    setOpen(false);
    navigate(url);
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="end"
        sideOffset={8}
      >
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                className="h-7 px-2 text-xs"
                disabled={markAllRead.isPending}
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Tout lire
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                setOpen(false);
                navigate("/settings/notifications");
              }}
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Chargement...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Aucune notification
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onRead={handleRead}
                onNavigate={handleNavigate}
              />
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
