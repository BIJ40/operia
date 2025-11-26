import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface WidgetPreference {
  id: string;
  widget_key: string;
  is_enabled: boolean;
  size: 'small' | 'medium' | 'large' | 'xlarge';
  display_order: number;
}

const supabaseAny = supabase as any;

// Tailles en nombre de blocs (1 bloc = moitié de la largeur max)
export const WIDGET_SIZES = {
  small: 1,   // 1 bloc (moitié largeur)
  medium: 2,  // 2 blocs (pleine largeur)
  large: 3,   // 3 blocs (1.5x largeur)
  xlarge: 4,  // 4 blocs (2x largeur)
};

export function useWidgetPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<WidgetPreference[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabaseAny
        .from('user_widget_preferences')
        .select('*')
        .eq('user_id', user.id)
        .order('display_order', { ascending: true });

      if (error) throw error;

      setPreferences(data || []);
    } catch (error) {
      console.error('Error loading widget preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (
    widgetKey: string,
    updates: Partial<Omit<WidgetPreference, 'id' | 'user_id' | 'widget_key'>>
  ) => {
    if (!user) return;

    try {
      const existing = preferences.find(p => p.widget_key === widgetKey);

      if (existing) {
        const { error } = await supabaseAny
          .from('user_widget_preferences')
          .update(updates)
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabaseAny
          .from('user_widget_preferences')
          .insert({
            user_id: user.id,
            widget_key: widgetKey,
            is_enabled: true,
            size: 'medium',
            display_order: preferences.length,
            ...updates,
          });

        if (error) throw error;
      }

      await loadPreferences();
    } catch (error) {
      console.error('Error updating widget preference:', error);
    }
  };

  const reorderPreferences = async (newOrder: WidgetPreference[]) => {
    if (!user) return;

    try {
      for (let i = 0; i < newOrder.length; i++) {
        await supabaseAny
          .from('user_widget_preferences')
          .update({ display_order: i })
          .eq('id', newOrder[i].id);
      }

      setPreferences(newOrder);
    } catch (error) {
      console.error('Error reordering widgets:', error);
    }
  };

  return {
    preferences,
    loading,
    updatePreference,
    reorderPreferences,
  };
}
