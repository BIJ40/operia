/**
 * Lazy-loaded Recharts components
 * Reduces initial bundle by ~200KB by code-splitting recharts
 * 
 * Usage: import { LazyBarChart, ... } from '@/components/ui/lazy-recharts';
 */

import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

function ChartFallback() {
  return <Skeleton className="w-full h-[200px] rounded-md" />;
}

function createLazyChart(componentName: string) {
  const LazyComponent = lazy(() =>
    import('recharts').then((mod) => ({
      default: (mod as any)[componentName],
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

export const LazyResponsiveContainer = createLazyChart('ResponsiveContainer');
export const LazyBarChart = createLazyChart('BarChart');
export const LazyLineChart = createLazyChart('LineChart');
export const LazyAreaChart = createLazyChart('AreaChart');
export const LazyPieChart = createLazyChart('PieChart');
export const LazyComposedChart = createLazyChart('ComposedChart');
export const LazyRadarChart = createLazyChart('RadarChart');
export const LazyScatterChart = createLazyChart('ScatterChart');
