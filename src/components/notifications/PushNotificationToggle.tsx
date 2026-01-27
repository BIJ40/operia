import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { cn } from "@/lib/utils";

interface PushNotificationToggleProps {
  variant?: "button" | "switch";
  className?: string;
}

export function PushNotificationToggle({ 
  variant = "switch",
  className 
}: PushNotificationToggleProps) {
  const { 
    isSupported, 
    isSubscribed, 
    isLoading, 
    permission,
    toggle 
  } = usePushNotifications();

  if (!isSupported) {
    return (
      <div className={cn("flex items-center gap-2 text-muted-foreground", className)}>
        <BellOff className="h-4 w-4" />
        <span className="text-sm">Push non supporté sur ce navigateur</span>
      </div>
    );
  }

  if (permission === "denied") {
    return (
      <div className={cn("flex items-center gap-2 text-destructive", className)}>
        <BellOff className="h-4 w-4" />
        <span className="text-sm">Notifications bloquées dans les paramètres du navigateur</span>
      </div>
    );
  }

  if (variant === "button") {
    return (
      <Button
        variant={isSubscribed ? "outline" : "default"}
        size="sm"
        onClick={toggle}
        disabled={isLoading}
        className={className}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : isSubscribed ? (
          <BellRing className="h-4 w-4 mr-2" />
        ) : (
          <Bell className="h-4 w-4 mr-2" />
        )}
        {isSubscribed ? "Désactiver les notifications" : "Activer les notifications"}
      </Button>
    );
  }

  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="flex items-center gap-2">
        {isSubscribed ? (
          <BellRing className="h-4 w-4 text-primary" />
        ) : (
          <Bell className="h-4 w-4 text-muted-foreground" />
        )}
        <Label htmlFor="push-toggle" className="text-sm cursor-pointer">
          Notifications push
        </Label>
      </div>
      <Switch
        id="push-toggle"
        checked={isSubscribed}
        onCheckedChange={toggle}
        disabled={isLoading}
      />
    </div>
  );
}
