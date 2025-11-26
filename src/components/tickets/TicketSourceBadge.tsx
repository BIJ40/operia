import { Badge } from '@/components/ui/badge';
import { MessageSquare, Ticket as TicketIcon, Bot } from 'lucide-react';

interface TicketSourceBadgeProps {
  source: 'chat' | 'portal' | 'system';
}

export function TicketSourceBadge({ source }: TicketSourceBadgeProps) {
  const config = {
    chat: {
      label: 'Chat',
      icon: MessageSquare,
      className: 'bg-blue-100 text-blue-800 border-blue-300',
    },
    portal: {
      label: 'Ticket',
      icon: TicketIcon,
      className: 'bg-green-100 text-green-800 border-green-300',
    },
    system: {
      label: 'Système',
      icon: Bot,
      className: 'bg-gray-100 text-gray-800 border-gray-300',
    },
  };

  const { label, icon: Icon, className } = config[source] || config.portal;

  return (
    <Badge variant="outline" className={`${className} flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
}