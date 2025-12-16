import { Badge } from '@/components/ui/badge';

interface ServiceBadgeProps {
  service: string | null;
}

export function ServiceBadge({ service }: ServiceBadgeProps) {
  const config: Record<string, { label: string; emoji: string; className: string }> = {
    apogee: {
      label: 'Apogée',
      emoji: '🖥️',
      className: 'bg-blue-100 text-blue-800 border-blue-300',
    },
    helpconfort: {
      label: 'HelpConfort',
      emoji: '🏠',
      className: 'bg-orange-100 text-orange-800 border-orange-300',
    },
    apporteurs: {
      label: 'Apporteurs',
      emoji: '🤝',
      className: 'bg-green-100 text-green-800 border-green-300',
    },
    conseil: {
      label: 'Conseil',
      emoji: '💡',
      className: 'bg-purple-100 text-purple-800 border-purple-300',
    },
    bug_app: {
      label: 'Bug Opéria',
      emoji: '🐛',
      className: 'bg-red-100 text-red-800 border-red-300',
    },
    autre: {
      label: 'Autre',
      emoji: '❓',
      className: 'bg-gray-100 text-gray-800 border-gray-300',
    },
  };

  const { label, emoji, className } = config[service || 'autre'] || config.autre;

  return (
    <Badge variant="outline" className={className}>
      {emoji} {label}
    </Badge>
  );
}
