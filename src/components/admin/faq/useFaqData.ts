/**
 * Hook for FAQ data management
 */

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { safeQuery, safeMutation } from '@/lib/safeQuery';
import { toast } from 'sonner';
import { FaqItem, FaqCategory, FaqContextStats, CONTEXT_OPTIONS, ContextType } from './types';

export function useFaqData() {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [categories, setCategories] = useState<FaqCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    
    const [itemsResult, categoriesResult] = await Promise.all([
      safeQuery<FaqItem[]>(
        supabase
          .from('faq_items')
          .select('*, category:faq_categories(id, label)')
          .order('display_order', { ascending: true }),
        'FAQ_HUB_LOAD_ITEMS'
      ),
      safeQuery<FaqCategory[]>(
        supabase.from('faq_categories').select('*').order('display_order'),
        'FAQ_HUB_LOAD_CATEGORIES'
      ),
    ]);

    if (itemsResult.success) setItems(itemsResult.data || []);
    if (categoriesResult.success) setCategories(categoriesResult.data || []);
    
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Calculate stats per context
  const contextStats: FaqContextStats[] = useMemo(() => {
    return CONTEXT_OPTIONS.map(ctx => {
      const contextItems = items.filter(i => i.context_type === ctx.value);
      const contextCategories = new Set(contextItems.map(i => i.category_id).filter(Boolean));
      const publishedCount = contextItems.filter(i => i.is_published).length;
      
      return {
        context: ctx.value,
        label: ctx.label,
        icon: ctx.icon,
        color: ctx.color,
        count: contextItems.length,
        categories: contextCategories.size,
        publishedPercent: contextItems.length > 0 
          ? Math.round((publishedCount / contextItems.length) * 100) 
          : 0,
      };
    });
  }, [items]);

  // Get items grouped by category for a context
  const getItemsByContext = (context: ContextType) => {
    const contextItems = items.filter(i => i.context_type === context);
    const grouped: Record<string, FaqItem[]> = {};
    
    // Group by category
    contextItems.forEach(item => {
      const categoryLabel = item.category?.label || 'Sans catégorie';
      if (!grouped[categoryLabel]) {
        grouped[categoryLabel] = [];
      }
      grouped[categoryLabel].push(item);
    });
    
    return grouped;
  };

  // CRUD operations
  const createItem = async (data: {
    question: string;
    answer: string;
    context_type: string;
    category_id: string | null;
    is_published: boolean;
    role_cible: string | null;
  }) => {
    const result = await safeMutation(
      supabase.from('faq_items').insert({
        question: data.question,
        answer: data.answer,
        context_type: data.context_type,
        category_id: data.category_id,
        is_published: data.is_published,
        role_cible: data.role_cible,
        display_order: items.length,
      } as never),
      'FAQ_HUB_CREATE'
    );
    
    if (result.success) {
      toast.success('FAQ créée');
      loadData();
      return true;
    }
    toast.error('Erreur lors de la création');
    return false;
  };

  const updateItem = async (id: string, data: {
    question?: string;
    answer?: string;
    context_type?: string;
    category_id?: string | null;
    is_published?: boolean;
    role_cible?: string | null;
  }) => {
    const updateData: Record<string, unknown> = {};
    if (data.question !== undefined) updateData.question = data.question;
    if (data.answer !== undefined) updateData.answer = data.answer;
    if (data.context_type !== undefined) updateData.context_type = data.context_type;
    if (data.category_id !== undefined) updateData.category_id = data.category_id;
    if (data.is_published !== undefined) updateData.is_published = data.is_published;
    if (data.role_cible !== undefined) updateData.role_cible = data.role_cible;

    const result = await safeMutation(
      supabase.from('faq_items').update(updateData).eq('id', id),
      'FAQ_HUB_UPDATE'
    );
    
    if (result.success) {
      toast.success('FAQ mise à jour');
      loadData();
      return true;
    }
    toast.error('Erreur lors de la mise à jour');
    return false;
  };

  const deleteItem = async (id: string) => {
    const result = await safeMutation(
      supabase.from('faq_items').delete().eq('id', id),
      'FAQ_HUB_DELETE'
    );
    
    if (result.success) {
      toast.success('FAQ supprimée');
      setItems(prev => prev.filter(i => i.id !== id));
      return true;
    }
    toast.error('Erreur lors de la suppression');
    return false;
  };

  const togglePublished = async (item: FaqItem) => {
    const result = await safeMutation(
      supabase.from('faq_items').update({ is_published: !item.is_published }).eq('id', item.id),
      'FAQ_HUB_TOGGLE_PUBLISH'
    );

    if (result.success) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_published: !i.is_published } : i));
      toast.success(item.is_published ? 'FAQ dépubliée' : 'FAQ publiée');
      return true;
    }
    return false;
  };

  return {
    items,
    categories,
    loading,
    contextStats,
    getItemsByContext,
    createItem,
    updateItem,
    deleteItem,
    togglePublished,
    refresh: loadData,
  };
}
