/**
 * Badge d'affichage de la priorité heat (0-12)
 * Utilisé dans Support et Apogée-Tickets
 */

import { getHeatPriorityConfig } from '@/utils/heatPriority';

interface HeatPriorityBadgeProps {
  priority: number;
  size?: 'sm' | 'default';
  showLabel?: boolean;
}

export function HeatPriorityBadge({ 
  priority, 
  size = 'default',
  showLabel = true 
}: HeatPriorityBadgeProps) {
  const config = getHeatPriorityConfig(priority);
  
  const sizeClasses = size === 'sm' 
    ? 'text-xs px-2 py-0.5' 
    : 'text-sm px-3 py-1';

  return (
    <span 
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClasses} ${config.bgColor} ${config.color}`}
    >
      <span>{config.emoji}</span>
      <span className="font-bold">{priority}</span>
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}
