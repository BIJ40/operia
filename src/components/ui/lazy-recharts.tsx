/**
 * Lazy-loaded Recharts components
 * Reduces initial bundle by ~200KB by code-splitting recharts
 * 
 * Usage: import { LazyBarChart, LazyLineChart, ... } from '@/components/ui/lazy-recharts';
 * These are drop-in replacements wrapped in Suspense.
 */

import { lazy, Suspense, type ComponentProps } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy-load the entire recharts module once
const RechartsModule = lazy(() => import('recharts'));

// Fallback component for chart loading
function ChartFallback({ height = 200 }: { height?: number }) {
  return <Skeleton className="w-full rounded-md" style={{ height }} />;
}

/**
 * HOC that creates a lazy-loaded recharts component
 * The component is loaded on first render, then cached by React.lazy
 */
function createLazyChart<K extends string>(componentName: K) {
  const LazyComponent = lazy(() =>
    import('recharts').then((mod) => ({
      default: (mod as Record<string, any>)[componentName],
    }))
  );

  function WrappedComponent(props: any) {
    return (
      <Suspense fallback={<ChartFallback />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  }
  WrappedComponent.displayName = `Lazy${componentName}`;
  return WrappedComponent;
}

// Pre-built lazy components for the most used recharts exports
export const LazyResponsiveContainer = createLazyChart('ResponsiveContainer');
export const LazyBarChart = createLazyChart('BarChart');
export const LazyLineChart = createLazyChart('LineChart');
export const LazyAreaChart = createLazyChart('AreaChart');
export const LazyPieChart = createLazyChart('PieChart');
export const LazyComposedChart = createLazyChart('ComposedChart');
export const LazyRadarChart = createLazyChart('RadarChart');
export const LazyScatterChart = createLazyChart('ScatterChart');
