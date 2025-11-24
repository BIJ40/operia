import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Block, AppData } from '@/types/block';
import { loadAppData, saveAppData } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import apogeeData from '@/data/apogee-data.json';

interface EditorContextType {
  blocks: Block[];
  isEditMode: boolean;
  setIsEditMode: (mode: boolean) => void;
  toggleEditMode: () => void;
  addBlock: (block: Omit<Block, 'id'>) => Promise<string>;
  updateBlock: (id: string, updates: Partial<Block>) => Promise<void>;
  deleteBlock: (id: string) => Promise<void>;
  reorderBlocks: (blocks: Block[]) => Promise<void>;
  exportData: () => Promise<string>;
  importData: (data: string) => Promise<void>;
  resetToDefault: () => void;
  reloadBlocks: () => Promise<void>;
  loading: boolean;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export function EditorProvider({ children }: { children: ReactNode }) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  // Load data from Supabase on mount with optimized query
  useEffect(() => {
    const initData = async () => {
      console.log('🔄 Chargement depuis Supabase...');
      
      try {
        // First load metadata without content to avoid timeout
        const { data, error } = await supabase
          .from('blocks')
          .select('id,type,title,slug,parent_id,order,icon,color_preset,hide_from_sidebar,hide_title,attachments,content_type,tips_type,summary,show_summary')
          .order('order');

        if (error) throw error;

        if (data) {
          // Then load content separately in smaller batches to avoid timeout
          const ids = data.map((b: any) => b.id);
          const batchSize = 50;
          const contentMap = new Map();
          
          // Load content in batches
          for (let i = 0; i < ids.length; i += batchSize) {
            const batchIds = ids.slice(i, i + batchSize);
            const { data: contentData, error: contentError } = await supabase
              .from('blocks')
              .select('id,content')
              .in('id', batchIds);

            if (contentError) throw contentError;
            
            // Add to content map
            contentData?.forEach((c: any) => contentMap.set(c.id, c.content));
          }

          // Transform data to match Block interface
          const transformedBlocks: Block[] = data.map((block: any) => ({
            id: block.id,
            type: block.type,
            title: block.title,
            slug: block.slug,
            content: contentMap.get(block.id) || '',
            parentId: block.parent_id,
            order: block.order,
            icon: block.icon,
            colorPreset: block.color_preset,
            hideFromSidebar: block.hide_from_sidebar || false,
            hideTitle: block.hide_title || false,
            attachments: block.attachments || [],
            contentType: block.content_type || 'section',
            tipsType: block.tips_type,
            summary: block.summary || '',
            showSummary: block.show_summary !== false,
          }));

          setBlocks(transformedBlocks);
          console.log(`⚡ ${transformedBlocks.length} blocks chargés depuis Supabase`);
        }
      } catch (error) {
        console.error('Erreur chargement Supabase:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de charger les données',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    initData();
  }, [toast]);

  // Auto-save DÉSACTIVÉ - sauvegarde uniquement sur action manuelle pour éviter les timeouts
  // La sauvegarde se fait maintenant uniquement via handleSave dans les pages

  const addBlock = useCallback(async (block: Omit<Block, 'id'>): Promise<string> => {
    if (!isAdmin) {
      toast({ title: 'Accès refusé', description: 'Seuls les administrateurs peuvent ajouter du contenu', variant: 'destructive' });
      return '';
    }
    const newBlock: Block = {
      ...block,
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      order: Math.floor(block.order ?? blocks.length),
    };
    
    // Sauvegarder immédiatement dans Supabase
    try {
      const { error } = await supabase.from('blocks').insert([{
        id: newBlock.id,
        type: newBlock.type,
        title: newBlock.title,
        slug: newBlock.slug,
        content: newBlock.content,
        parent_id: newBlock.parentId,
        order: newBlock.order,
        icon: newBlock.icon,
        color_preset: newBlock.colorPreset,
        hide_from_sidebar: newBlock.hideFromSidebar,
        attachments: newBlock.attachments as any,
        content_type: newBlock.contentType || 'section',
        tips_type: newBlock.tipsType,
        summary: newBlock.summary || '',
        show_summary: newBlock.showSummary !== false,
      }]);
      
      if (error) {
        console.error('Erreur insertion Supabase:', error);
        throw error;
      }
      
      setBlocks((prev) => [...prev, newBlock]);
      return newBlock.id;
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder la catégorie', variant: 'destructive' });
      return '';
    }
  }, [blocks.length, toast, isAdmin]);

  const updateBlock = useCallback(async (id: string, updates: Partial<Block>, options?: { allowContentDeletion?: boolean }) => {
    if (!isAdmin) {
      toast({ title: 'Accès refusé', description: 'Seuls les administrateurs peuvent modifier le contenu', variant: 'destructive' });
      return;
    }
    
    // 🔒 VERROU DE SÉCURITÉ : empêcher le vidage accidentel du contenu
    if (updates.content !== undefined) {
      const existingBlock = blocks.find(b => b.id === id);
      
      if (existingBlock && existingBlock.content && existingBlock.content.trim().length > 0) {
        const newContent = updates.content?.trim() || '';
        
        // Si on essaie de vider un contenu existant SANS autorisation explicite
        if (newContent.length === 0 && !options?.allowContentDeletion) {
          console.error('🚫 TENTATIVE DE VIDAGE DE CONTENU BLOQUÉE:', {
            blockId: id,
            blockTitle: existingBlock.title,
            previousContentLength: existingBlock.content.length,
            attemptedNewContent: newContent
          });
          
          toast({ 
            title: '🔒 Opération bloquée', 
            description: 'Impossible de vider le contenu d\'une section par erreur. Utilisez le formulaire d\'édition pour supprimer intentionnellement du contenu.',
            variant: 'destructive',
          });
          return;
        }
      }
    }
    
    // Sauvegarder dans Supabase
    try {
      const updateData: any = {};
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.content !== undefined) updateData.content = updates.content;
      if (updates.slug !== undefined) updateData.slug = updates.slug;
      if (updates.icon !== undefined) updateData.icon = updates.icon;
      if (updates.colorPreset !== undefined) updateData.color_preset = updates.colorPreset;
      if (updates.order !== undefined) updateData.order = updates.order;
      if (updates.parentId !== undefined) updateData.parent_id = updates.parentId;
      if (updates.hideFromSidebar !== undefined) updateData.hide_from_sidebar = updates.hideFromSidebar;
      if (updates.attachments !== undefined) updateData.attachments = updates.attachments;
      if (updates.contentType !== undefined) updateData.content_type = updates.contentType;
      if (updates.tipsType !== undefined) updateData.tips_type = updates.tipsType;
      if (updates.summary !== undefined) updateData.summary = updates.summary;
      if (updates.showSummary !== undefined) updateData.show_summary = updates.showSummary;
      
      const { error } = await supabase
        .from('blocks')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
      
      setBlocks((prev) =>
        prev.map((block) => (block.id === id ? { ...block, ...updates } : block))
      );
      
      console.log('✅ Bloc mis à jour avec succès:', id);
    } catch (error) {
      console.error('Erreur mise à jour:', error);
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder les modifications', variant: 'destructive' });
    }
  }, [isAdmin, toast, blocks]);

  const deleteBlock = useCallback(async (id: string) => {
    if (!isAdmin) {
      toast({ title: 'Accès refusé', description: 'Seuls les administrateurs peuvent supprimer du contenu', variant: 'destructive' });
      return;
    }
    
    const blockToDelete = blocks.find(b => b.id === id);
    const contentLength = blockToDelete?.content?.replace(/<[^>]*>/g, '').trim().length || 0;
    
    // Si le contenu est vide ou très court (< 20 caractères), on supprime définitivement
    // Sinon, on archive pour éviter les pertes accidentelles
    const shouldDeletePermanently = contentLength < 20;
    
    try {
      if (shouldDeletePermanently) {
        // Suppression définitive
        const { error } = await supabase
          .from('blocks')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        
        setBlocks((prev) => prev.filter((block) => block.id !== id));
        toast({ title: 'Bloc supprimé', description: 'Le bloc vide a été supprimé définitivement.' });
      } else {
        // Archivage (pour contenu non vide)
        const { error } = await supabase
          .from('blocks')
          .update({ hide_from_sidebar: true })
          .eq('id', id);
        
        if (error) throw error;
        
        setBlocks((prev) => prev.map((block) =>
          block.id === id ? { ...block, hideFromSidebar: true } : block
        ));
        toast({ title: 'Bloc archivé', description: 'Le contenu est caché mais toujours présent en base.' });
      }
    } catch (error) {
      console.error('Erreur suppression:', error);
      toast({ title: 'Erreur', description: 'Impossible de supprimer le bloc', variant: 'destructive' });
    }
  }, [toast, isAdmin, blocks]);

  const reorderBlocks = useCallback(async (blocksToReorder: Block[]) => {
    if (!isAdmin) {
      toast({ title: 'Accès refusé', description: 'Seuls les administrateurs peuvent réorganiser le contenu', variant: 'destructive' });
      return;
    }
    
    // Mettre à jour l'état en fusionnant avec les blocs existants
    setBlocks(prevBlocks => prevBlocks.map(block => {
      const updatedBlock = blocksToReorder.find(b => b.id === block.id);
      return updatedBlock || block;
    }));
    
    // Sauvegarder l'ordre dans Supabase
    try {
      for (const block of blocksToReorder) {
        await supabase
          .from('blocks')
          .update({ order: block.order })
          .eq('id', block.id);
      }
      
      console.log('✅ Ordre sauvegardé dans Supabase');
    } catch (error) {
      console.error('Erreur sauvegarde ordre:', error);
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder l\'ordre', variant: 'destructive' });
    }
  }, [isAdmin, toast]);

  const exportDataFn = useCallback(async (): Promise<string> => {
    const appData: AppData = {
      blocks,
      version: '1.0',
      lastModified: Date.now(),
    };
    return JSON.stringify(appData, null, 2);
  }, [blocks]);

  const importDataFn = useCallback(async (data: string): Promise<void> => {
    try {
      const parsed: AppData = JSON.parse(data);
      setBlocks(parsed.blocks);
      await saveAppData(parsed);
      toast({ title: 'Données importées avec succès' });
    } catch (error) {
      toast({ title: 'Erreur d\'import', description: 'Format JSON invalide', variant: 'destructive' });
      throw error;
    }
  }, [toast]);

  const resetToDefault = useCallback(() => {
    const initialData = apogeeData as AppData;
    setBlocks(initialData.blocks);
    saveAppData(initialData);
    toast({ title: 'Données réinitialisées', description: 'Les données par défaut ont été restaurées' });
  }, [toast]);

  const toggleEditMode = useCallback(() => {
    if (!isAdmin) {
      toast({ title: 'Accès refusé', description: 'Seuls les administrateurs peuvent activer le mode édition', variant: 'destructive' });
      return;
    }
    setIsEditMode((prev) => {
      const newValue = !prev;
      // Synchroniser avec localStorage
      localStorage.setItem('editMode', String(newValue));
      // Émettre un événement personnalisé pour les autres composants
      window.dispatchEvent(new Event('editModeChange'));
      return newValue;
    });
  }, [isAdmin, toast]);

  const reloadBlocks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('blocks')
        .select('*')
        .order('order');

      if (error) throw error;

      if (data) {
        const transformedBlocks: Block[] = data.map((block: any) => ({
          id: block.id,
          type: block.type,
          title: block.title,
          slug: block.slug,
          content: block.content || '',
          parentId: block.parent_id,
          order: block.order,
          icon: block.icon,
          colorPreset: block.color_preset,
          hideFromSidebar: block.hide_from_sidebar || false,
          attachments: block.attachments || [],
        }));

        setBlocks(transformedBlocks);
        console.log(`🔄 ${transformedBlocks.length} blocks rechargés`);
      }
    } catch (error) {
      console.error('Erreur rechargement:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de recharger les données',
        variant: 'destructive',
      });
    }
  }, [toast]);

  return (
    <EditorContext.Provider
      value={{
        blocks,
        isEditMode,
        setIsEditMode,
        toggleEditMode,
        addBlock,
        updateBlock,
        deleteBlock,
        reorderBlocks,
        exportData: exportDataFn,
        importData: importDataFn,
        resetToDefault,
        reloadBlocks,
        loading,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used within EditorProvider');
  }
  return context;
}
