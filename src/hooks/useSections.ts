import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Section {
  id: string;
  category_id: string;
  title: string;
  content: any[];
  display_order: number;
}

export function useSections(categoryId: string | null) {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (categoryId) {
      loadSections();
    } else {
      setSections([]);
      setLoading(false);
    }
  }, [categoryId]);

  const loadSections = async () => {
    if (!categoryId) return;
    
    try {
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .eq('category_id', categoryId)
        .order('display_order');

      if (error) throw error;
      setSections((data || []) as Section[]);
    } catch (error) {
      console.error('Erreur chargement sections:', error);
      toast.error('Erreur lors du chargement des sections');
    } finally {
      setLoading(false);
    }
  };

  const addSection = async (section: Omit<Section, 'id' | 'display_order' | 'category_id'>) => {
    if (!categoryId) return null;
    
    try {
      const maxOrder = Math.max(...sections.map(s => s.display_order), -1);
      const { data, error } = await supabase
        .from('sections')
        .insert({
          ...section,
          category_id: categoryId,
          display_order: maxOrder + 1
        })
        .select()
        .single();

      if (error) throw error;
      
      setSections([...sections, data as Section]);
      toast.success('Section ajoutée');
      return data as Section;
    } catch (error) {
      console.error('Erreur ajout section:', error);
      toast.error('Erreur lors de l\'ajout');
      return null;
    }
  };

  const updateSection = async (id: string, updates: Partial<Section>) => {
    try {
      const { error } = await supabase
        .from('sections')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setSections(sections.map(sec => sec.id === id ? { ...sec, ...updates } : sec));
      toast.success('Section mise à jour');
    } catch (error) {
      console.error('Erreur mise à jour section:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const deleteSection = async (id: string) => {
    try {
      const { error } = await supabase
        .from('sections')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSections(sections.filter(sec => sec.id !== id));
      toast.success('Section supprimée');
    } catch (error) {
      console.error('Erreur suppression section:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  return {
    sections,
    loading,
    addSection,
    updateSection,
    deleteSection,
    refreshSections: loadSections
  };
}
