import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { logError } from '@/lib/logger';
import { useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { supabase } from '@/integrations/supabase/client';
import { CacheManager } from '@/lib/cache-manager';

export interface HcServicesBlock {
  id: string;
  type: 'category' | 'section';
  title: string;
  content: string;
  slug: string;
  parentId: string | null;
  order: number;
  icon?: string;
  colorPreset: string;
  hideFromSidebar?: boolean;
  hideTitle?: boolean;
  attachments?: any[];
  contentType?: string;
  tipsType?: string;
  summary?: string;
  showSummary?: boolean;
  isInProgress?: boolean;
  completedAt?: string;
  contentUpdatedAt?: string;
  isEmpty?: boolean;
  showTitleOnCard?: boolean;
  targetRoles?: string[];
}

interface HcServicesEditorContextType {
  blocks: HcServicesBlock[];
  isEditMode: boolean;
  addBlock: (block: Omit<HcServicesBlock, 'id'>) => Promise<string>;
  updateBlock: (id: string, updates: Partial<HcServicesBlock>) => Promise<void>;
  deleteBlock: (id: string) => Promise<void>;
  reorderBlocks: (blocks: HcServicesBlock[]) => Promise<void>;
  reloadBlocks: () => Promise<void>;
  loading: boolean;
}

const HcServicesEditorContext = createContext<HcServicesEditorContextType | undefined>(undefined);

const CACHE_KEY = 'hc_services_blocks_cache';

// Map database row to HcServicesBlock
function mapRowToBlock(row: any): HcServicesBlock {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    content: row.content || '',
    slug: row.slug,
    parentId: row.parent_id,
    order: row.order,
    icon: row.icon,
    colorPreset: row.color_preset,
    hideFromSidebar: row.hide_from_sidebar,
    hideTitle: row.hide_title,
    attachments: row.attachments || [],
    contentType: row.content_type,
    tipsType: row.tips_type,
    summary: row.summary,
    showSummary: row.show_summary,
    isInProgress: row.is_in_progress,
    completedAt: row.completed_at,
    contentUpdatedAt: row.content_updated_at,
    isEmpty: row.is_empty,
    showTitleOnCard: row.show_title_on_card,
    targetRoles: row.target_roles || ['all'],
  };
}

export function HcServicesEditorProvider({ children }: { children: ReactNode }) {
  const [blocks, setBlocks] = useState<HcServicesBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { hasGlobalRole, hasModuleOption } = usePermissions();
  const { user } = useAuthCore();
  const location = useLocation();
  
  const canEdit = hasGlobalRole('platform_admin') || hasModuleOption('support.guides', 'edition');
  const isEditMode = canEdit;

  const loadBlocks = useCallback(async () => {
    if (!user) {
      setBlocks([]);
      setLoading(false);
      return;
    }

    // Check cache first
    const cached = CacheManager.getItem<OperiaBlock[]>(CACHE_KEY);
    if (cached && cached.length > 0) {
      setBlocks(cached);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('operia_blocks')
        .select('*')
        .order('order');

      if (error) throw error;

      const mappedBlocks = (data || []).map(mapRowToBlock);
      setBlocks(mappedBlocks);
      CacheManager.setItem(CACHE_KEY, mappedBlocks, 5 * 60 * 1000);
    } catch (error) {
      logError('Error loading operia blocks:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger le guide HC Services',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadBlocks();
  }, [loadBlocks]);

  const addBlock = useCallback(async (block: Omit<HcServicesBlock, 'id'>): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('operia_blocks')
        .insert({
          type: block.type,
          title: block.title,
          content: block.content,
          slug: block.slug,
          parent_id: block.parentId,
          order: block.order,
          icon: block.icon,
          color_preset: block.colorPreset,
          hide_from_sidebar: block.hideFromSidebar,
          hide_title: block.hideTitle,
          attachments: block.attachments,
          content_type: block.contentType,
          tips_type: block.tipsType,
          summary: block.summary,
          show_summary: block.showSummary,
          is_in_progress: block.isInProgress,
          is_empty: block.isEmpty,
          show_title_on_card: block.showTitleOnCard,
          target_roles: block.targetRoles,
        })
        .select()
        .single();

      if (error) throw error;

      const newBlock = mapRowToBlock(data);
      setBlocks(prev => {
        const updated = [...prev, newBlock];
        CacheManager.setItem(CACHE_KEY, updated, 5 * 60 * 1000);
        return updated;
      });

      return data.id;
    } catch (error) {
      logError('Error adding block:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ajouter le bloc',
        variant: 'destructive',
      });
      throw error;
    }
  }, [toast]);

  const updateBlock = useCallback(async (id: string, updates: Partial<HcServicesBlock>): Promise<void> => {
    try {
      const dbUpdates: any = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.content !== undefined) dbUpdates.content = updates.content;
      if (updates.slug !== undefined) dbUpdates.slug = updates.slug;
      if (updates.parentId !== undefined) dbUpdates.parent_id = updates.parentId;
      if (updates.order !== undefined) dbUpdates.order = updates.order;
      if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
      if (updates.colorPreset !== undefined) dbUpdates.color_preset = updates.colorPreset;
      if (updates.hideFromSidebar !== undefined) dbUpdates.hide_from_sidebar = updates.hideFromSidebar;
      if (updates.hideTitle !== undefined) dbUpdates.hide_title = updates.hideTitle;
      if (updates.attachments !== undefined) dbUpdates.attachments = updates.attachments;
      if (updates.contentType !== undefined) dbUpdates.content_type = updates.contentType;
      if (updates.tipsType !== undefined) dbUpdates.tips_type = updates.tipsType;
      if (updates.summary !== undefined) dbUpdates.summary = updates.summary;
      if (updates.showSummary !== undefined) dbUpdates.show_summary = updates.showSummary;
      if (updates.isInProgress !== undefined) dbUpdates.is_in_progress = updates.isInProgress;
      if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt;
      if (updates.contentUpdatedAt !== undefined) dbUpdates.content_updated_at = updates.contentUpdatedAt;
      if (updates.isEmpty !== undefined) dbUpdates.is_empty = updates.isEmpty;
      if (updates.showTitleOnCard !== undefined) dbUpdates.show_title_on_card = updates.showTitleOnCard;
      if (updates.targetRoles !== undefined) dbUpdates.target_roles = updates.targetRoles;

      const { error } = await supabase
        .from('operia_blocks')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;

      setBlocks(prev => {
        const updated = prev.map(b => b.id === id ? { ...b, ...updates } : b);
        CacheManager.setItem(CACHE_KEY, updated, 5 * 60 * 1000);
        return updated;
      });
    } catch (error) {
      logError('Error updating block:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le bloc',
        variant: 'destructive',
      });
      throw error;
    }
  }, [toast]);

  const deleteBlock = useCallback(async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('operia_blocks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setBlocks(prev => {
        const updated = prev.filter(b => b.id !== id);
        CacheManager.setItem(CACHE_KEY, updated, 5 * 60 * 1000);
        return updated;
      });
    } catch (error) {
      logError('Error deleting block:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le bloc',
        variant: 'destructive',
      });
      throw error;
    }
  }, [toast]);

  const reorderBlocks = useCallback(async (reorderedBlocks: HcServicesBlock[]): Promise<void> => {
    try {
      const updates = reorderedBlocks.map((block, index) => ({
        id: block.id,
        order: index,
      }));

      for (const update of updates) {
        await supabase
          .from('operia_blocks')
          .update({ order: update.order })
          .eq('id', update.id);
      }

      setBlocks(prev => {
        const blockMap = new Map(prev.map(b => [b.id, b]));
        const updated = reorderedBlocks.map((rb, index) => ({
          ...blockMap.get(rb.id)!,
          order: index,
        }));
        CacheManager.setItem(CACHE_KEY, updated, 5 * 60 * 1000);
        return updated;
      });
    } catch (error) {
      logError('Error reordering blocks:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de réordonner les blocs',
        variant: 'destructive',
      });
      throw error;
    }
  }, [toast]);

  const reloadBlocks = useCallback(async (): Promise<void> => {
    CacheManager.removeItem(CACHE_KEY);
    setLoading(true);
    await loadBlocks();
  }, [loadBlocks]);

  return (
    <HcServicesEditorContext.Provider
      value={{
        blocks,
        isEditMode,
        addBlock,
        updateBlock,
        deleteBlock,
        reorderBlocks,
        reloadBlocks,
        loading,
      }}
    >
      {children}
    </HcServicesEditorContext.Provider>
  );
}

export function useHcServicesEditor() {
  const context = useContext(HcServicesEditorContext);
  if (!context) {
    throw new Error('useHcServicesEditor must be used within HcServicesEditorProvider');
  }
  return context;
}

// Export alias for backward compatibility
export type OperiaBlock = HcServicesBlock;
export const OperiaEditorProvider = HcServicesEditorProvider;
export const useOperiaEditor = useHcServicesEditor;
