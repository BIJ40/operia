import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { BaseWidget } from './widgets/BaseWidget';
import { NavigationWidget } from './widgets/NavigationWidget';
import { MesIndicateursCard } from './MesIndicateursCard';
import { WeatherWidget } from './widgets/WeatherWidget';
import { QuickNotesWidget } from './widgets/QuickNotesWidget';
import { CalendarWidget } from './widgets/CalendarWidget';
import { useWidgetPreferences, WidgetPreference } from '@/hooks/use-widget-preferences';
import { useAuth } from '@/contexts/AuthContext';
import { ApiToggleProvider } from '@/apogee-connect/contexts/ApiToggleContext';
import { AgencyProvider } from '@/apogee-connect/contexts/AgencyContext';

interface HomeCard {
  id: string;
  title: string;
  description: string;
  link: string;
  icon: string;
}

interface WidgetGridProps {
  homeCards: HomeCard[];
  isDashboardEditMode: boolean;
}

type Widget = {
  id: string;
  type: string;
  card?: HomeCard;
  isLocked?: boolean;
  isMandatory?: boolean;
  preference: WidgetPreference;
};

export function WidgetGrid({ homeCards, isDashboardEditMode }: WidgetGridProps) {
  const { hasAccessToScope, agence } = useAuth();
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

  // Créer la liste des widgets avec leurs préférences
  const widgets: Widget[] = [
    // Widgets de navigation depuis homeCards
    ...homeCards.map(card => {
      const widgetKey = `nav-${card.id}`;
      const pref = preferences.find(p => p.widget_key === widgetKey);
      
      let scope: 'apogee' | 'apporteurs' | 'helpconfort' | 'mes_indicateurs' | null = null;
      if (card.link.includes('/apogee')) scope = 'apogee';
      else if (card.link.includes('/apporteur')) scope = 'apporteurs';
      else if (card.link.includes('/helpconfort')) scope = 'helpconfort';
      else if (card.link.includes('/mes-indicateurs')) scope = 'mes_indicateurs';
      
      const isLocked = scope === 'mes_indicateurs' 
        ? (!hasAccessToScope(scope) || !agence)
        : (scope ? !hasAccessToScope(scope) : false);

      const isMandatory = scope === 'mes_indicateurs';

      return {
        id: widgetKey,
        type: scope === 'mes_indicateurs' && !isLocked && agence ? 'mes-indicateurs' : 'navigation',
        card,
        isLocked,
        isMandatory,
        preference: pref || {
          id: widgetKey,
          widget_key: widgetKey,
          is_enabled: true,
          size: 'medium' as const,
          display_order: homeCards.indexOf(card),
        },
      };
    }),
    // Widget Support
    {
      id: 'support-tickets',
      type: 'navigation',
      card: {
        id: 'support',
        title: 'Support / Tickets',
        description: 'Créer un ticket ou consulter vos demandes',
        link: '/support-tickets',
        icon: 'Headphones',
      },
      isLocked: false,
      isMandatory: true,
      preference: preferences.find(p => p.widget_key === 'support-tickets') || {
        id: 'support-tickets',
        widget_key: 'support-tickets',
        is_enabled: true,
        size: 'medium' as const,
        display_order: homeCards.length,
      },
    },
    // Nouveaux widgets
    {
      id: 'weather',
      type: 'weather',
      preference: preferences.find(p => p.widget_key === 'weather') || {
        id: 'weather',
        widget_key: 'weather',
        is_enabled: false,
        size: 'small' as const,
        display_order: homeCards.length + 1,
      },
    },
    {
      id: 'quick-notes',
      type: 'quick-notes',
      preference: preferences.find(p => p.widget_key === 'quick-notes') || {
        id: 'quick-notes',
        widget_key: 'quick-notes',
        is_enabled: false,
        size: 'medium' as const,
        display_order: homeCards.length + 2,
      },
    },
    {
      id: 'calendar',
      type: 'calendar',
      preference: preferences.find(p => p.widget_key === 'calendar') || {
        id: 'calendar',
        widget_key: 'calendar',
        is_enabled: false,
        size: 'medium' as const,
        display_order: homeCards.length + 3,
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

  const handleRemove = (widgetKey: string) => {
    updatePreference(widgetKey, { is_enabled: false });
  };

  const renderWidget = (widget: Widget) => {
    if (widget.type === 'mes-indicateurs') {
      return (
        <ApiToggleProvider>
          <AgencyProvider>
            <MesIndicateursCard />
          </AgencyProvider>
        </ApiToggleProvider>
      );
    }
    
    if (widget.type === 'weather') {
      return <WeatherWidget />;
    }
    
    if (widget.type === 'quick-notes') {
      return <QuickNotesWidget />;
    }
    
    if (widget.type === 'calendar') {
      return <CalendarWidget />;
    }
    
    // Navigation widget
    if (widget.card) {
      return (
        <NavigationWidget
          title={widget.card.title}
          description={widget.card.description}
          link={widget.card.link}
          icon={widget.card.icon}
          isLocked={widget.isLocked || false}
        />
      );
    }
    
    return null;
  };

  const activeWidget = widgets.find(w => w.id === activeId);

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
        <div className="grid grid-cols-4 gap-4 auto-rows-min items-start">
          {widgets.map((widget) => (
            <BaseWidget
              key={widget.id}
              id={widget.id}
              size={widget.preference.size}
              isDashboardEditMode={true}
              isRemovable={!widget.isMandatory}
              onSizeChange={(size) => handleSizeChange(widget.id, size)}
              onRemove={() => handleRemove(widget.id)}
            >
              {renderWidget(widget)}
            </BaseWidget>
          ))}
        </div>
      </SortableContext>
      
      <DragOverlay>
        {activeWidget && (
          <div className="opacity-50">
            <BaseWidget
              id={activeWidget.id}
              size={activeWidget.preference.size}
              isDashboardEditMode={false}
            >
              {renderWidget(activeWidget)}
            </BaseWidget>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
