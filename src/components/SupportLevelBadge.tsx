import { Badge } from '@/components/ui/badge';
import { Shield } from 'lucide-react';

interface SupportLevelBadgeProps {
  level: number;
  showLabel?: boolean;
}

const getSupportLevelLabel = (level: number) => {
  switch (level) {
    case 1: return 'SA1';
    case 2: return 'SA2';
    case 3: return 'SA3';
    default: return `SA${level}`;
  }
};

const getSupportLevelColor = (level: number) => {
  switch (level) {
    case 1: return 'bg-blue-500 hover:bg-blue-600';
    case 2: return 'bg-orange-500 hover:bg-orange-600';
    case 3: return 'bg-red-500 hover:bg-red-600';
    default: return 'bg-gray-500 hover:bg-gray-600';
  }
};

const getSupportLevelFullLabel = (level: number) => {
  switch (level) {
    case 1: return 'Support de base';
    case 2: return 'Support technique';
    case 3: return 'Support expert';
    default: return '';
  }
};

export function SupportLevelBadge({ level, showLabel = false }: SupportLevelBadgeProps) {
  return (
    <Badge 
      className={`${getSupportLevelColor(level)} text-white flex items-center gap-1 px-2 py-0.5`}
      title={`Niveau ${level} - ${getSupportLevelFullLabel(level)}`}
    >
      <Shield className="w-3 h-3" />
      {getSupportLevelLabel(level)}
      {showLabel && <span className="ml-1">- {getSupportLevelFullLabel(level)}</span>}
    </Badge>
  );
}
