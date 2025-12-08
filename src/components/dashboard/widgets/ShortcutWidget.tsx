/**
 * ShortcutWidget - Widget de raccourci vers une page
 */

import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, BookMarked, MessageSquare, HelpCircle, 
  Users, FileText, Lock, BarChart3, Monitor, 
  Kanban, Building2, MapPin, Settings, UserCog,
  ExternalLink
} from 'lucide-react';

interface ShortcutWidgetProps {
  route: string;
  icon?: string;
  name?: string;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  BookOpen,
  BookMarked,
  MessageSquare,
  HelpCircle,
  Users,
  FileText,
  Lock,
  BarChart3,
  Monitor,
  Kanban,
  Building2,
  MapPin,
  Settings,
  UserCog,
};

export function ShortcutWidget({ route, icon, name }: ShortcutWidgetProps) {
  const navigate = useNavigate();
  const Icon = icon ? ICON_MAP[icon] : ExternalLink;

  return (
    <Button
      variant="ghost"
      className="w-full h-full flex flex-col items-center justify-center gap-2 hover:bg-primary/5 transition-colors"
      onClick={() => navigate(route)}
    >
      {Icon && <Icon className="h-8 w-8 text-primary" />}
      {name && <span className="text-xs text-muted-foreground text-center">{name}</span>}
    </Button>
  );
}
