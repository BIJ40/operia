import { createContext, useContext, ReactNode, useState, useCallback, useEffect } from 'react';
import { Block } from '@/types/block';
import { loadApporteurData, saveApporteurData, exportApporteurData, importApporteurData } from '@/lib/db-apporteurs';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ApporteurEditorContextType {
  blocks: Block[];
  isEditMode: boolean;
  loading: boolean;
  addBlock: (block: Omit<Block, 'id' | 'order'>) => Promise<string>;
  updateBlock: (id: string, updates: Partial<Block>) => Promise<void>;
  deleteBlock: (id: string) => Promise<void>;
  reorderBlocks: (blocks: Block[]) => void;
  exportData: () => Promise<string>;
  importData: (data: string) => Promise<void>;
  resetToDefault: () => void;
  toggleEditMode: () => void;
}

const ApporteurEditorContext = createContext<ApporteurEditorContextType | null>(null);

export function ApporteurEditorProvider({ children }: { children: ReactNode }) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();

  // Chargement initial
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await loadApporteurData();
        if (data) {
          setBlocks(data.blocks);
        }
      } catch (error) {
        console.error('Erreur chargement données apporteurs:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Sauvegarde automatique DÉSACTIVÉE - sauvegarde immédiate dans chaque fonction

  const addBlock = useCallback(async (block: Omit<Block, 'id' | 'order'>): Promise<string> => {
    if (!isAdmin) return '';
    
    const newId = crypto.randomUUID();
    const maxOrder = blocks.reduce((max, b) => Math.max(max, b.order), -1);
    
    const newBlock: Block = {
      ...block,
      id: newId,
      order: maxOrder + 1,
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
            attachments: b.attachments as any || [],
            hide_from_sidebar: b.hideFromSidebar || false,
            show_title_on_card: b.showTitleOnCard !== false,
            show_title_in_menu: b.showTitleInMenu !== false,
            is_single_section: b.isSingleSection || false,
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
          attachments: newBlock.attachments as any || [],
          hide_from_sidebar: newBlock.hideFromSidebar || false,
          show_title_on_card: newBlock.showTitleOnCard !== false,
          show_title_in_menu: newBlock.showTitleInMenu !== false,
          is_single_section: newBlock.isSingleSection || false,
        }]);
        
        if (error) throw error;
        setBlocks(prev => [...prev, newBlock]);
      }
    } catch (error) {
      console.error('Erreur sauvegarde apporteur:', error);
    }
    
    return newId;
  }, [blocks, isAdmin]);

  const updateBlock = useCallback(async (id: string, updates: Partial<Block>) => {
    if (!isAdmin) return;
    
    try {
      // Préparer les données pour Supabase
      const updateData: any = {};
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
      if (updates.attachments !== undefined) updateData.attachments = updates.attachments;
      
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
      console.error('Erreur mise à jour apporteur:', error);
    }
  }, [isAdmin]);

  const deleteBlock = useCallback(async (id: string) => {
    if (!isAdmin) return;
    
    try {
      // Récupérer tous les blocs enfants à supprimer
      const childBlocks = blocks.filter(b => b.parentId === id);
      const idsToDelete = [id, ...childBlocks.map(b => b.id)];
      
      // Supprimer de Supabase
      const { error } = await supabase
        .from('apporteur_blocks')
        .delete()
        .in('id', idsToDelete);
      
      if (error) throw error;
      
      setBlocks(prev => {
        const filtered = prev.filter(block => {
          if (block.id === id) return false;
          if (block.parentId === id) return false;
          return true;
        });
        return filtered;
      });
    } catch (error) {
      console.error('Erreur suppression apporteur:', error);
    }
  }, [isAdmin, blocks]);

  const reorderBlocks = useCallback((newBlocks: Block[]) => {
    if (!isAdmin) return;
    setBlocks(newBlocks);
  }, [isAdmin]);

  const handleExportData = useCallback(async (): Promise<string> => {
    return await exportApporteurData();
  }, []);

  const handleImportData = useCallback(async (data: string) => {
    if (!isAdmin) return;
    
    await importApporteurData(data);
    const loadedData = await loadApporteurData();
    if (loadedData) {
      setBlocks(loadedData.blocks);
    }
  }, [isAdmin]);

  const resetToDefault = useCallback(() => {
    if (!isAdmin) return;
    setBlocks([]);
  }, [isAdmin]);

  const toggleEditMode = useCallback(() => {
    if (!isAdmin) return;
    setIsEditMode(prev => {
      const newValue = !prev;
      // Synchroniser avec localStorage
      localStorage.setItem('editMode', String(newValue));
      // Émettre un événement personnalisé
      window.dispatchEvent(new Event('editModeChange'));
      return newValue;
    });
  }, [isAdmin]);

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
