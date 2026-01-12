import { memo } from 'react';
import {
  AnimatedStatsIcon,
  AnimatedMapPinIcon,
  AnimatedTvIcon,
  AnimatedListIcon,
  AnimatedBuildingIcon,
} from './animated-icons';

export type AnimatedIconId = 'stats_hub' | 'carte_rdv' | 'diffusion' | 'actions' | 'mes_apporteurs';

interface AnimatedTileIconProps {
  iconId: string;
  isHovered: boolean;
  size?: number;
  className?: string;
}

const ICON_MAP: Record<AnimatedIconId, React.ComponentType<{ isHovered: boolean; size: number; className?: string }>> = {
  stats_hub: AnimatedStatsIcon,
  carte_rdv: AnimatedMapPinIcon,
  diffusion: AnimatedTvIcon,
  actions: AnimatedListIcon,
  mes_apporteurs: AnimatedBuildingIcon,
};

export const AnimatedTileIcon = memo(function AnimatedTileIcon({
  iconId,
  isHovered,
  size = 20,
  className = '',
}: AnimatedTileIconProps) {
  const IconComponent = ICON_MAP[iconId as AnimatedIconId];

  if (!IconComponent) {
    return null;
  }

  return <IconComponent isHovered={isHovered} size={size} className={className} />;
});
