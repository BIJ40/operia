import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardWidgetProps {
  title: string;
  description?: string;
  children: ReactNode;
  size?: 'small' | 'medium' | 'large';
  onConfigure?: () => void;
  onRemove?: () => void;
  isConfigMode?: boolean;
  className?: string;
}

export function DashboardWidget({
  title,
  description,
  children,
  size = 'medium',
  onConfigure,
  onRemove,
  isConfigMode = false,
  className
}: DashboardWidgetProps) {
  const sizeClasses = {
    small: 'col-span-1 row-span-1',
    medium: 'col-span-1 md:col-span-2 row-span-1',
    large: 'col-span-1 md:col-span-2 lg:col-span-3 row-span-2'
  };

  return (
    <Card className={cn(sizeClasses[size], 'flex flex-col', className)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          {description && (
            <CardDescription className="text-sm mt-1">{description}</CardDescription>
          )}
        </div>
        {isConfigMode && (
          <div className="flex gap-1">
            {onConfigure && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onConfigure}>
                <Settings className="h-3.5 w-3.5" />
              </Button>
            )}
            {onRemove && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onRemove}>
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {children}
      </CardContent>
    </Card>
  );
}
