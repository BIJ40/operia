import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { BaseWidget } from '@/components/landing/widgets/BaseWidget';
import { StatsOverview } from '@/components/admin/overview/StatsOverview';
import { QuickActions } from '@/components/admin/overview/QuickActions';
import { NavigationCards } from '@/components/admin/overview/NavigationCards';
import { useWidgetPreferences, WidgetPreference } from '@/hooks/use-widget-preferences';

interface AdminWidget {
  id: string;
  type: 'stats' | 'quick-actions' | 'navigation';
  preference: WidgetPreference;
}

export function AdminWidgetGrid() {
  const { preferences, updatePreference, reorderPreferences } = useWidgetPreferences();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const widgets: AdminWidget[] = [
    {
      id: 'admin-stats-overview',
      type: 'stats' as const,
      preference: preferences.find(p => p.widget_key === 'admin-stats-overview') || {
        id: 'admin-stats-overview',
        widget_key: 'admin-stats-overview',
        is_enabled: true,
        size: 'large' as const,
        display_order: 0,
      },
    },
    {
      id: 'admin-quick-actions',
      type: 'quick-actions' as const,
      preference: preferences.find(p => p.widget_key === 'admin-quick-actions') || {
        id: 'admin-quick-actions',
        widget_key: 'admin-quick-actions',
        is_enabled: true,
        size: 'medium' as const,
        display_order: 1,
      },
    },
    {
      id: 'admin-navigation-cards',
      type: 'navigation' as const,
      preference: preferences.find(p => p.widget_key === 'admin-navigation-cards') || {
        id: 'admin-navigation-cards',
        widget_key: 'admin-navigation-cards',
        is_enabled: true,
        size: 'large' as const,
        display_order: 2,
      },
    },
  ]
    .filter(w => w.preference.is_enabled)
    .sort((a, b) => a.preference.display_order - b.preference.display_order);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = widgets.findIndex(w => w.id === active.id);
      const newIndex = widgets.findIndex(w => w.id === over.id);

      const reorderedWidgets = arrayMove(widgets, oldIndex, newIndex);
      const newPreferences = reorderedWidgets.map((w, index) => ({
        ...w.preference,
        display_order: index,
      }));

      reorderPreferences(newPreferences as WidgetPreference[]);
    }
  };

  const handleSizeChange = (widgetKey: string, size: 'small' | 'medium' | 'large' | 'xlarge') => {
    updatePreference(widgetKey, { size });
  };

  const renderWidget = (widget: AdminWidget) => {
    if (widget.type === 'stats') return <StatsOverview />;
    if (widget.type === 'quick-actions') return <QuickActions />;
    return <NavigationCards />;
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={widgets.map(w => w.id)}
        strategy={rectSortingStrategy}
      >
        <div className="grid grid-cols-8 gap-4 auto-rows-min items-start mt-6">
          {widgets.map((widget) => (
            <BaseWidget
              key={widget.id}
              id={widget.id}
              size={widget.preference.size}
              isDashboardEditMode={true}
              isRemovable={false}
              onSizeChange={(size) => handleSizeChange(widget.id, size)}
            >
              {renderWidget(widget)}
            </BaseWidget>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
