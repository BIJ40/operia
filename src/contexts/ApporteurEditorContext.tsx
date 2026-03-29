import { createContext, useContext, ReactNode, useState, useCallback, useEffect } from 'react';
import { Block } from '@/types/block';
import { loadApporteurData, saveApporteurData, exportApporteurData, importApporteurData } from '@/lib/db-apporteurs';
import { usePermissionsBridge } from '@/hooks/usePermissionsBridge';
import { supabase } from '@/integrations/supabase/client';
import { CacheManager } from '@/lib/cache-manager';
import { logError, logDebug } from '@/lib/logger';
import type { Database } from '@/integrations/supabase/types';

type ApporteurBlockUpdate = Database['public']['Tables']['apporteur_blocks']['Update'];

interface ApporteurEditorContextType {
  blocks: Block[];
  isEditMode: boolean;
  loading: boolean;
  addBlock: (block: Omit<Block, 'id'>) => Promise<string>;
  updateBlock: (id: string, updates: Partial<Block>) => Promise<void>;
  deleteBlock: (id: string) => Promise<void>;
  reorderBlocks: (blocks: Block[]) => Promise<void>;
  exportData: () => Promise<string>;
  importData: (data: string) => Promise<void>;
  resetToDefault: () => void;
  toggleEditMode: () => void;
}

const ApporteurEditorContext = createContext<ApporteurEditorContextType | null>(null);

export function ApporteurEditorProvider({ children }: { children: ReactNode }) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const { hasGlobalRole, hasModuleOption } = usePermissionsBridge();
  
  // V2: Remplace isAdmin par vérification de rôle + option module
  const canEdit = hasGlobalRole('platform_admin') || hasModuleOption('support.guides', 'edition');
  
  // Aligner avec EditorContext: isEditMode = canEdit automatiquement
  const isEditMode = canEdit;

  const CACHE_KEY = 'apporteur_blocks_cache';
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Chargement initial avec cache
  useEffect(() => {
    const loadData = async () => {
      try {
        // Vérifier le cache d'abord
        const cached = CacheManager.getItem<Block[]>(CACHE_KEY);
        if (cached) {
          setBlocks(cached);
          setLoading(false);
          return;
        }

        // Charger depuis Supabase si pas en cache
        const data = await loadApporteurData();
        if (data) {
          setBlocks(data.blocks);
          // Sauvegarder dans le cache
          CacheManager.setItem(CACHE_KEY, data.blocks, CACHE_TTL);
        }
      } catch (error) {
        logError('APPORTEUR_EDITOR', 'Erreur chargement données apporteurs', { error });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Sauvegarde automatique DÉSACTIVÉE - sauvegarde immédiate dans chaque fonction

  const addBlock = useCallback(async (block: Omit<Block, 'id'>): Promise<string> => {
    if (!canEdit) return '';
    
    const newId = crypto.randomUUID();
    const maxOrder = blocks.reduce((max, b) => Math.max(max, b.order), -1);
    
    const newBlock: Block = {
      ...block,
      id: newId,
      order: Math.floor(block.order ?? maxOrder + 1),
    };
    
    try {
      // Si c'est une catégorie pour les apporteurs, créer automatiquement les sous-catégories
      if (block.type === 'category') {
        const defaultSubcategories = [
          'Présentation',
          'Barème / tarifs',
          'Exigences',
          'Gestion extranet',
          'Particularités',
          'Aide à la rédaction d\'un devis',
          'Base documentaire'
        ];
        
        const subcategories: Block[] = defaultSubcategories.map((title, index) => ({
          id: crypto.randomUUID(),
          type: 'subcategory' as const,
          title,
          content: '',
          colorPreset: 'white' as const,
          order: maxOrder + 2 + index,
          slug: `${block.slug}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          parentId: newId,
          attachments: [],
          hideFromSidebar: false,
          showTitleOnCard: true,
          showTitleInMenu: true,
        }));
        
        const allNewBlocks = [newBlock, ...subcategories];
        
        // Sauvegarder dans Supabase
        const { error } = await supabase.from('apporteur_blocks').insert(
          allNewBlocks.map(b => ({
            id: b.id,
            type: b.type,
            title: b.title,
            content: b.content || '',
            icon: b.icon || null,
            color_preset: b.colorPreset || 'white',
            order: b.order,
            slug: b.slug,
            parent_id: b.parentId || null,
            attachments: (b.attachments || []) as unknown as Database['public']['Tables']['apporteur_blocks']['Insert']['attachments'],
            hide_from_sidebar: b.hideFromSidebar || false,
            show_title_on_card: b.showTitleOnCard !== false,
            show_title_in_menu: b.showTitleInMenu !== false,
            is_single_section: b.isSingleSection || false,
            content_type: b.contentType || 'section',
            tips_type: b.tipsType || null,
            summary: b.summary || '',
            show_summary: b.showSummary !== false,
          }))
        );
        
        if (error) throw error;
        setBlocks(prev => [...prev, ...allNewBlocks]);
      } else {
        // Sauvegarder dans Supabase
        const { error } = await supabase.from('apporteur_blocks').insert([{
          id: newBlock.id,
          type: newBlock.type,
          title: newBlock.title,
          content: newBlock.content || '',
          icon: newBlock.icon || null,
          color_preset: newBlock.colorPreset || 'white',
          order: newBlock.order,
          slug: newBlock.slug,
          parent_id: newBlock.parentId || null,
          attachments: (newBlock.attachments || []) as unknown as Database['public']['Tables']['apporteur_blocks']['Insert']['attachments'],
          hide_from_sidebar: newBlock.hideFromSidebar || false,
          show_title_on_card: newBlock.showTitleOnCard !== false,
          show_title_in_menu: newBlock.showTitleInMenu !== false,
          is_single_section: newBlock.isSingleSection || false,
          content_type: newBlock.contentType || 'section',
          tips_type: newBlock.tipsType || null,
          summary: newBlock.summary || '',
          show_summary: newBlock.showSummary !== false,
        }]);
        
        if (error) {
          logError('APPORTEUR_EDITOR', 'Erreur insertion Supabase', { error });
          throw error;
        }
        setBlocks(prev => [...prev, newBlock]);
      }
      return newId;
    } catch (error) {
      logError('APPORTEUR_EDITOR', 'Erreur sauvegarde apporteur', { error });
      return '';
    }
  }, [blocks, canEdit]);

  const updateBlock = useCallback(async (id: string, updates: Partial<Block>) => {
    if (!canEdit) return;
    
    try {
      // Préparer les données pour Supabase
      const updateData: ApporteurBlockUpdate = {};
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.content !== undefined) updateData.content = updates.content;
      if (updates.slug !== undefined) updateData.slug = updates.slug;
      if (updates.icon !== undefined) updateData.icon = updates.icon;
      if (updates.colorPreset !== undefined) updateData.color_preset = updates.colorPreset;
      if (updates.order !== undefined) updateData.order = updates.order;
      if (updates.parentId !== undefined) updateData.parent_id = updates.parentId;
      if (updates.hideFromSidebar !== undefined) updateData.hide_from_sidebar = updates.hideFromSidebar;
      if (updates.showTitleOnCard !== undefined) updateData.show_title_on_card = updates.showTitleOnCard;
      if (updates.showTitleInMenu !== undefined) updateData.show_title_in_menu = updates.showTitleInMenu;
      if (updates.isSingleSection !== undefined) updateData.is_single_section = updates.isSingleSection;
      if (updates.attachments !== undefined) updateData.attachments = updates.attachments as unknown as ApporteurBlockUpdate['attachments'];
      if (updates.contentType !== undefined) updateData.content_type = updates.contentType;
      if (updates.tipsType !== undefined) updateData.tips_type = updates.tipsType;
      if (updates.summary !== undefined) updateData.summary = updates.summary;
      if (updates.showSummary !== undefined) updateData.show_summary = updates.showSummary;
      if (updates.isEmpty !== undefined) updateData.is_empty = updates.isEmpty;
      
      // Sauvegarder dans Supabase
      const { error } = await supabase
        .from('apporteur_blocks')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
      
      setBlocks(prev => prev.map(block => 
        block.id === id ? { ...block, ...updates } : block
      ));
    } catch (error) {
      logError('APPORTEUR_EDITOR', 'Erreur mise à jour apporteur', { error });
    }
  }, [canEdit]);

  const deleteBlock = useCallback(async (id: string) => {
    if (!canEdit) return;
    
    const blockToDelete = blocks.find(b => b.id === id);
    const contentLength = blockToDelete?.content?.replace(/<[^>]*>/g, '').trim().length || 0;
    
    // Si le contenu est vide ou très court (< 20 caractères), on supprime définitivement
    // Sinon, on archive pour éviter les pertes accidentelles
    const shouldDeletePermanently = contentLength < 20;
    
    try {
      if (shouldDeletePermanently) {
        // Supprimer définitivement de la base de données
        const { error } = await supabase
          .from('apporteur_blocks')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        
        // Supprimer également tous les enfants (sous-catégories et sections)
        const childrenIds = blocks.filter(b => b.parentId === id).map(b => b.id);
        if (childrenIds.length > 0) {
          const { error: childError } = await supabase
            .from('apporteur_blocks')
            .delete()
            .in('id', childrenIds);
          
          if (childError) throw childError;
        }
        
        // Mettre à jour l'état local
        setBlocks(prev => prev.filter(block => 
          block.id !== id && block.parentId !== id
        ));
      } else {
        // Archivage (pour contenu non vide)
        const { error } = await supabase
          .from('apporteur_blocks')
          .update({ hide_from_sidebar: true })
          .eq('id', id);
        
        if (error) throw error;
        
        setBlocks(prev => prev.map(block =>
          block.id === id ? { ...block, hideFromSidebar: true } : block
        ));
      }
    } catch (error) {
      logError('APPORTEUR_EDITOR', 'Erreur suppression apporteur', { error });
    }
  }, [canEdit, blocks]);

  const reorderBlocks = useCallback(async (blocksToReorder: Block[]) => {
    if (!canEdit) return;
    
    // Mettre à jour l'état en fusionnant avec les blocs existants
    setBlocks(prevBlocks => prevBlocks.map(block => {
      const updatedBlock = blocksToReorder.find(b => b.id === block.id);
      return updatedBlock || block;
    }));
    
    // Sauvegarder l'ordre dans Supabase
    try {
      for (const block of blocksToReorder) {
        await supabase
          .from('apporteur_blocks')
          .update({ order: block.order })
          .eq('id', block.id);
      }
      
      logDebug('APPORTEUR_EDITOR', 'Ordre apporteurs sauvegardé dans Supabase');
    } catch (error) {
      logError('APPORTEUR_EDITOR', 'Erreur sauvegarde ordre apporteurs', { error });
    }
  }, [canEdit]);

  const handleExportData = useCallback(async (): Promise<string> => {
    return await exportApporteurData();
  }, []);

  const handleImportData = useCallback(async (data: string) => {
    if (!canEdit) return;
    
    await importApporteurData(data);
    const loadedData = await loadApporteurData();
    if (loadedData) {
      setBlocks(loadedData.blocks);
    }
  }, [canEdit]);

  const resetToDefault = useCallback(() => {
    if (!canEdit) return;
    setBlocks([]);
  }, [canEdit]);

  // toggleEditMode est maintenu pour compatibilité mais ne fait rien
  // car isEditMode = canEdit automatiquement
  const toggleEditMode = useCallback(() => {
    // No-op: isEditMode est maintenant dérivé de canEdit
  }, []);

  return (
    <ApporteurEditorContext.Provider value={{
      blocks,
      isEditMode,
      loading,
      addBlock,
      updateBlock,
      deleteBlock,
      reorderBlocks,
      exportData: handleExportData,
      importData: handleImportData,
      resetToDefault,
      toggleEditMode,
    }}>
      {children}
    </ApporteurEditorContext.Provider>
  );
}

export function useApporteurEditor() {
  const context = useContext(ApporteurEditorContext);
  if (!context) {
    throw new Error('useApporteurEditor must be used within ApporteurEditorProvider');
  }
  return context;
}
