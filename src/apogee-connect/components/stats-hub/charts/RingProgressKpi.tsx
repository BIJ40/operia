import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface RingProgressKpiProps {
  value: number;
  maxValue?: number;
  label: string;
  subtitle?: string;
  color?: string;
  size?: number;
  formatValue?: (value: number) => string;
}

export function RingProgressKpi({
  value,
  maxValue = 100,
  label,
  subtitle,
  color = "hsl(var(--primary))",
  size = 140,
  formatValue = (v) => String(v),
}: RingProgressKpiProps) {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min((value / maxValue) * 100, 100);
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background ring */}
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
            className="opacity-30"
          />
          {/* Progress ring */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 2.5, ease: [0.4, 0, 0.2, 1] }}
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-lg font-bold"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.5, duration: 0.6, ease: "easeOut" }}
          >
            {formatValue(value)}
          </motion.span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
      </div>
      {subtitle && (
        <p className="mt-2 text-sm text-muted-foreground text-center">{subtitle}</p>
      )}
    </div>
  );
}
