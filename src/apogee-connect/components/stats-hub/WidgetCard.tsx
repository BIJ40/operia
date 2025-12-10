import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Maximize2 } from 'lucide-react';

interface WidgetCardProps {
  title: string;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  color?: string;
}

export function WidgetCard({ title, children, onClick, className, color = 'primary' }: WidgetCardProps) {
  const colorClasses: Record<string, string> = {
    primary: 'border-t-primary',
    blue: 'border-t-helpconfort-blue',
    green: 'border-t-green-500',
    orange: 'border-t-helpconfort-orange',
    purple: 'border-t-purple-500',
  };

  return (
    <Card
      className={cn(
        'relative p-4 border-t-4 cursor-pointer group',
        'hover:shadow-lg transition-all duration-200',
        'bg-gradient-to-br from-card to-muted/10',
        colorClasses[color] || colorClasses.primary,
        className
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <Maximize2 className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Preview content */}
      <div className="h-32 overflow-hidden relative">
        {children}
        
        {/* Fade overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card to-transparent pointer-events-none" />
      </div>

      {/* Click hint */}
      <div className="absolute bottom-2 left-0 right-0 text-center">
        <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          Cliquer pour agrandir
        </span>
      </div>
    </Card>
  );
}
