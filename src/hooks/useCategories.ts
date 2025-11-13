import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ColorPreset } from '@/types/block';
import { toast } from 'sonner';

export interface Category {
  id: string;
  title: string;
  icon: string;
  color_preset: ColorPreset;
  scope: 'guide-apogee' | 'apporteurs-nationaux' | 'informations-utiles';
  display_order: number;
}

export interface Section {
  id: string;
  category_id: string;
  title: string;
  content: any[];
  display_order: number;
}

export function useCategories(scope: Category['scope']) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, [scope]);

  const loadCategories = async () => {
    try {
      const { data: supabaseCategories, error } = await supabase
        .from('categories')
        .select('*')
        .eq('scope', scope)
        .order('display_order');

      if (error) throw error;

      // Migration depuis localStorage si nécessaire
      if (!supabaseCategories || supabaseCategories.length === 0) {
        const localKey = `${scope}-categories`;
        const localData = localStorage.getItem(localKey);
        
        if (localData) {
          const localCategories = JSON.parse(localData);
          
          for (let i = 0; i < localCategories.length; i++) {
            const cat = localCategories[i];
            const { data: newCat, error: insertError } = await supabase
              .from('categories')
              .insert({
                title: cat.title,
                icon: cat.icon || 'BookOpen',
                color_preset: cat.colorPreset || cat.color_preset || 'blue',
                scope: scope,
                display_order: i
              })
              .select()
              .single();

            if (!insertError && newCat && cat.sections) {
              // Migrer les sections
              for (let j = 0; j < cat.sections.length; j++) {
                const section = cat.sections[j];
                await supabase.from('sections').insert({
                  category_id: newCat.id,
                  title: section.title,
                  content: section.content || [],
                  display_order: j
                });
              }
            }
          }
          
          // Recharger
          const { data: newData } = await supabase
            .from('categories')
            .select('*')
            .eq('scope', scope)
            .order('display_order');
          setCategories((newData || []) as Category[]);
        } else {
          setCategories([]);
        }
      } else {
        setCategories(supabaseCategories as Category[]);
      }
    } catch (error) {
      console.error('Erreur chargement catégories:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async (category: Omit<Category, 'id' | 'display_order'>) => {
    try {
      const maxOrder = Math.max(...categories.map(c => c.display_order), -1);
      const { data, error } = await supabase
        .from('categories')
        .insert({
          ...category,
          scope,
          display_order: maxOrder + 1
        })
        .select()
        .single();

      if (error) throw error;
      
      setCategories([...categories, data as Category]);
      toast.success('Catégorie ajoutée');
      return data as Category;
    } catch (error) {
      console.error('Erreur ajout catégorie:', error);
      toast.error('Erreur lors de l\'ajout');
      return null;
    }
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    try {
      const { error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setCategories(categories.map(cat => cat.id === id ? { ...cat, ...updates } : cat));
      toast.success('Catégorie mise à jour');
    } catch (error) {
      console.error('Erreur mise à jour catégorie:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCategories(categories.filter(cat => cat.id !== id));
      toast.success('Catégorie supprimée');
    } catch (error) {
      console.error('Erreur suppression catégorie:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  return {
    categories,
    loading,
    addCategory,
    updateCategory,
    deleteCategory,
    refreshCategories: loadCategories
  };
}
