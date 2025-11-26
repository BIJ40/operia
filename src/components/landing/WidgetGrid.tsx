import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
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
import { useWidgetPreferences, WidgetPreference } from '@/hooks/use-widget-preferences';
import { useAuth } from '@/contexts/AuthContext';
import { ApiToggleProvider } from '@/apogee-connect/contexts/ApiToggleContext';
import { AgencyProvider } from '@/apogee-connect/contexts/AgencyContext';
import * as Icons from 'lucide-react';

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

export function WidgetGrid({ homeCards, isDashboardEditMode }: WidgetGridProps) {
  const { hasAccessToScope, agence } = useAuth();
  const { preferences, updatePreference, reorderPreferences } = useWidgetPreferences();

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

  // Créer la liste des widgets avec leurs préférences
  const widgets = homeCards
    .map(card => {
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

      return {
        id: widgetKey,
        type: scope === 'mes_indicateurs' && !isLocked && agence ? 'mes-indicateurs' : 'navigation',
        card,
        isLocked,
        preference: pref || {
          id: widgetKey,
          widget_key: widgetKey,
          is_enabled: true,
          size: 'medium' as const,
          display_order: homeCards.indexOf(card),
        },
      };
    })
    .filter(w => w.preference.is_enabled)
    .sort((a, b) => a.preference.display_order - b.preference.display_order);

  // Ajouter le widget Support
  const supportWidget = {
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
    preference: preferences.find(p => p.widget_key === 'support-tickets') || {
      id: 'support-tickets',
      widget_key: 'support-tickets',
      is_enabled: true,
      size: 'medium' as const,
      display_order: widgets.length,
    },
  };

  if (supportWidget.preference.is_enabled) {
    widgets.push(supportWidget);
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={widgets.map(w => w.id)}
        strategy={rectSortingStrategy}
      >
        <div className="grid grid-cols-4 gap-4 auto-rows-fr">
          {widgets.map((widget) => (
            <BaseWidget
              key={widget.id}
              id={widget.id}
              size={widget.preference.size}
              isDashboardEditMode={isDashboardEditMode}
              onSizeChange={(size) => handleSizeChange(widget.id, size)}
              onRemove={() => handleRemove(widget.id)}
            >
              {widget.type === 'mes-indicateurs' ? (
                <ApiToggleProvider>
                  <AgencyProvider>
                    <MesIndicateursCard />
                  </AgencyProvider>
                </ApiToggleProvider>
              ) : (
                <NavigationWidget
                  title={widget.card.title}
                  description={widget.card.description}
                  link={widget.card.link}
                  icon={widget.card.icon}
                  isLocked={widget.isLocked}
                />
              )}
            </BaseWidget>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
