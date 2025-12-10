import { cn } from '@/lib/utils';

interface MiniGaugeProps {
  value: number; // 0-100
  color?: string;
}

const colorMap: Record<string, string> = {
  primary: 'text-primary',
  blue: 'text-helpconfort-blue',
  green: 'text-green-500',
  orange: 'text-helpconfort-orange',
  purple: 'text-purple-500',
  red: 'text-red-500',
};

const bgColorMap: Record<string, string> = {
  primary: 'stroke-primary',
  blue: 'stroke-helpconfort-blue',
  green: 'stroke-green-500',
  orange: 'stroke-helpconfort-orange',
  purple: 'stroke-purple-500',
  red: 'stroke-red-500',
};

export function MiniGauge({ value, color = 'primary' }: MiniGaugeProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const circumference = 2 * Math.PI * 16; // radius = 16
  const strokeDashoffset = circumference - (clampedValue / 100) * circumference;

  return (
    <div className="relative w-10 h-10">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 40 40">
        {/* Background circle */}
        <circle
          cx="20"
          cy="20"
          r="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          className="text-muted/30"
        />
        {/* Progress circle */}
        <circle
          cx="20"
          cy="20"
          r="16"
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          className={cn(bgColorMap[color] || bgColorMap.primary)}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      {/* Center value */}
      <div className={cn(
        'absolute inset-0 flex items-center justify-center text-[10px] font-bold',
        colorMap[color] || colorMap.primary
      )}>
        {Math.round(clampedValue)}%
      </div>
    </div>
  );
}
