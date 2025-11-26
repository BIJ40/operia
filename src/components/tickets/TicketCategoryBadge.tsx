import { Badge } from '@/components/ui/badge';
import { Bug, Lightbulb, AlertTriangle, HelpCircle, MoreHorizontal } from 'lucide-react';

interface TicketCategoryBadgeProps {
  category: string | null;
}

export function TicketCategoryBadge({ category }: TicketCategoryBadgeProps) {
  if (!category) return null;

  const config: Record<string, { label: string; icon: any; className: string }> = {
    bug: {
      label: 'Bug',
      icon: Bug,
      className: 'bg-red-100 text-red-800 border-red-300',
    },
    improvement: {
      label: 'Amélioration',
      icon: Lightbulb,
      className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    },
    blocking: {
      label: 'Blocage',
      icon: AlertTriangle,
      className: 'bg-orange-100 text-orange-800 border-orange-300',
    },
    question: {
      label: 'Question',
      icon: HelpCircle,
      className: 'bg-purple-100 text-purple-800 border-purple-300',
    },
    other: {
      label: 'Autre',
      icon: MoreHorizontal,
      className: 'bg-gray-100 text-gray-800 border-gray-300',
    },
  };

  const { label, icon: Icon, className } = config[category] || config.other;

  return (
    <Badge variant="outline" className={`${className} flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
}