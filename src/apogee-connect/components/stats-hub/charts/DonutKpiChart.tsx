import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutKpiChartProps {
  segments: DonutSegment[];
  total?: number;
  centerLabel?: string;
  centerValue?: string;
  size?: number;
  showLegend?: boolean;
}

export function DonutKpiChart({
  segments,
  total: providedTotal,
  centerLabel = "Total",
  centerValue,
  size = 160,
  showLegend = true,
}: DonutKpiChartProps) {
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  const total = providedTotal ?? segments.reduce((sum, s) => sum + s.value, 0);
  
  // Calculate stroke dash arrays for each segment
  let cumulativeOffset = 0;
  const segmentData = segments.map((segment) => {
    const percentage = total > 0 ? (segment.value / total) * 100 : 0;
    const dashLength = (percentage / 100) * circumference;
    const dashGap = circumference - dashLength;
    const offset = cumulativeOffset;
    cumulativeOffset += dashLength;
    
    return {
      ...segment,
      percentage,
      dashArray: `${dashLength} ${dashGap}`,
      dashOffset: -offset,
    };
  });

  const formatValue = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M€`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)}k€`;
    return `${Math.round(val)}€`;
  };

  return (
    <div className="flex items-center gap-6">
      {/* Donut Chart */}
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          {/* Background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
            className="opacity-20"
          />
          
          {/* Segments */}
          {segmentData.map((segment, index) => (
            <motion.circle
              key={segment.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeLinecap="butt"
              strokeDasharray={segment.dashArray}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: segment.dashOffset }}
              transition={{ 
                duration: 2.5, 
                ease: [0.4, 0, 0.2, 1],
                delay: index * 0.2 
              }}
            />
          ))}
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-lg font-bold"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.5, duration: 0.6, ease: "easeOut" }}
          >
            {centerValue ?? formatValue(total)}
          </motion.span>
          <span className="text-xs text-muted-foreground">{centerLabel}</span>
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          {segmentData.slice(0, 5).map((segment) => (
            <motion.div
              key={segment.label}
              className="flex items-center gap-2"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.8 + segmentData.indexOf(segment) * 0.1, duration: 0.4 }}
            >
              <div
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: segment.color }}
              />
              <span className="text-xs text-muted-foreground truncate flex-1">
                {segment.label}
              </span>
              <span className="text-xs font-medium">
                {segment.percentage.toFixed(0)}%
              </span>
            </motion.div>
          ))}
          {segments.length > 5 && (
            <span className="text-xs text-muted-foreground">
              +{segments.length - 5} autres
            </span>
          )}
        </div>
      )}
    </div>
  );
}
