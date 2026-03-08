/**
 * StatIA Builder - Panneau de capsules
 */

import React from 'react';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';

interface CapsulePanelProps {
  title: string;
  icon: React.ReactNode;
  items: Array<{
    id: string;
    label: string;
    icon: string;
    color: string;
    description?: string;
    unit?: string;
  }>;
  type: 'dimension' | 'measure' | 'filter';
  onDragStart?: (item: CapsulePanelProps['items'][number]) => void;
}

export function CapsulePanel({ 
  title, 
  icon, 
  items, 
  type,
  onDragStart 
}: CapsulePanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {icon}
        <span>{title}</span>
      </div>
      
      <div className="space-y-1.5">
        {items.map((item) => {
          const IconComponent = (Icons as any)[item.icon] || Icons.Circle;
          
          return (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({ type, ...item }));
                onDragStart?.(item);
              }}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg cursor-grab",
                "bg-background border hover:border-primary/50 hover:shadow-sm",
                "transition-all duration-200",
                "active:cursor-grabbing active:scale-95"
              )}
            >
              <div className={cn(
                "w-6 h-6 rounded flex items-center justify-center text-white",
                item.color
              )}>
                <IconComponent className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{item.label}</div>
                {item.unit && (
                  <div className="text-xs text-muted-foreground">{item.unit}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
