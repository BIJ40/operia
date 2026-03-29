import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Block, AppData } from '@/types/block';
import { loadAppData, saveAppData } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { usePermissionsBridge } from '@/hooks/usePermissionsBridge';
import { supabase } from '@/integrations/supabase/client';
import apogeeData from '@/data/apogee-data.json';
import { CacheManager } from '@/lib/cache-manager';
import { logEditor } from '@/lib/logger';
import type { Database } from '@/integrations/supabase/types';

type BlockRow = Database['public']['Tables']['blocks']['Row'];
type BlockUpdate = Database['public']['Tables']['blocks']['Update'];

interface EditorContextType {
  blocks: Block[];
  isEditMode: boolean;
  canEdit: boolean;
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
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { hasGlobalRole, hasModuleOption } = usePermissionsBridge();
  const { user } = useAuthCore();
  const location = useLocation();
  
  // V2: Remplace isAdmin par vérification de rôle + option module
  const canEdit = hasGlobalRole('platform_admin') || hasModuleOption('support.guides', 'edition');
  
  // État local pour le mode édition (toggle manuel)
  const [editModeEnabled, setEditModeEnabled] = useState(false);
  
  // isEditMode = canEdit ET toggle activé
  const isEditMode = canEdit && editModeEnabled;

  // Cache avec TTL de 5 minutes
  const CACHE_KEY = 'apogee_blocks_cache';
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Load data from Supabase when user is available
  useEffect(() => {
    const initData = async () => {
      // Si l'utilisateur n'est pas connecté, on ne charge rien
      if (!user) {
        setBlocks([]);
        setLoading(false);
        return;
      }

      logEditor.info('Chargement depuis Supabase pour l\'utilisateur', user.id);

      // Vérifier le cache d'abord avec CacheManager
      const cached = CacheManager.getItem<Block[]>(CACHE_KEY);
      if (cached && cached.length > 0) {
        // Vérifier l'intégrité du cache
        const categories = cached.filter(b => b.type === 'category');
        const sections = cached.filter(b => b.type === 'section');
        
        logEditor.info(`Cache trouvé: ${cached.length} blocks (${categories.length} catégories, ${sections.length} sections)`);
        
        // Si cache suspect (catégories sans sections), l'invalider
        if (categories.length > 0 && sections.length === 0) {
          logEditor.warn('Cache invalide détecté, rechargement forcé...');
          CacheManager.removeItem(CACHE_KEY);
        } else {
          setBlocks(cached);
          setLoading(false);
          return;
        }
      }

      try {
        // First load metadata without content to avoid timeout
        const { data, error } = await supabase
          .from('blocks')
          .select('id,type,title,slug,parent_id,order,icon,color_preset,hide_from_sidebar,hide_title,attachments,content_type,tips_type,summary,show_summary,is_in_progress,completed_at,content_updated_at,is_empty')
          .order('order');

        if (error) throw error;

        if (data && data.length > 0) {
          // Then load content separately in smaller batches to avoid timeout
          const ids = data.map((b) => b.id);
          const batchSize = 50;
          const contentMap = new Map<string, string>();

          // Load content in batches
          for (let i = 0; i < ids.length; i += batchSize) {
            const batchIds = ids.slice(i, i + batchSize);
            const { data: contentData, error: contentError } = await supabase
              .from('blocks')
              .select('id,content')
              .in('id', batchIds);

            if (contentError) throw contentError;

            // Add to content map
            contentData?.forEach((c) => contentMap.set(c.id, c.content || ''));
          }

          // Transform data to match Block interface
          const transformedBlocks: Block[] = data.map((block) => ({
            id: block.id,
            type: block.type as Block['type'],
            title: block.title,
            slug: block.slug,
            content: contentMap.get(block.id) || '',
            parentId: block.parent_id,
            order: block.order,
            icon: block.icon,
            colorPreset: block.color_preset as Block['colorPreset'],
            hideFromSidebar: block.hide_from_sidebar || false,
            hideTitle: block.hide_title || false,
            attachments: (block.attachments || []) as unknown as Block['attachments'],
            contentType: (block.content_type || 'section') as Block['contentType'],
            tipsType: block.tips_type as Block['tipsType'],
            summary: block.summary || '',
            showSummary: block.show_summary !== false,
            isInProgress: block.is_in_progress || false,
            completedAt: block.completed_at || null,
            contentUpdatedAt: block.content_updated_at || null,
            isEmpty: block.is_empty || false,
          }));

          // Vérifier qu'on a bien des catégories ET des sections
          const categories = transformedBlocks.filter(b => b.type === 'category');
          const sections = transformedBlocks.filter(b => b.type === 'section');
          
          logEditor.info(`${transformedBlocks.length} blocks chargés depuis Supabase (${categories.length} catégories, ${sections.length} sections)`);
          
          // Si on a des catégories mais pas de sections, c'est suspect - ne pas utiliser le cache
          if (categories.length > 0 && sections.length === 0) {
            logEditor.warn('Cache suspect: catégories sans sections, rechargement complet...');
            CacheManager.removeItem(CACHE_KEY);
            // Forcer un rechargement complet en ne mettant pas en cache
            setBlocks(transformedBlocks);
            setLoading(false);
            return;
          }
          
          setBlocks(transformedBlocks);
          
          // Sauvegarder dans le cache avec CacheManager seulement si les données sont complètes
          CacheManager.setItem(CACHE_KEY, transformedBlocks, CACHE_TTL);
        } else {
          setBlocks([]);
          logEditor.warn('Aucun block retourné par Supabase');
        }
      } catch (error) {
        logEditor.error('Erreur chargement Supabase:', error);
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
  }, [toast, user?.id]);

  // Auto-save DÉSACTIVÉ - sauvegarde uniquement sur action manuelle pour éviter les timeouts
  // La sauvegarde se fait maintenant uniquement via handleSave dans les pages

  const addBlock = useCallback(async (block: Omit<Block, 'id'>): Promise<string> => {
    if (!canEdit) {
      toast({ title: 'Accès refusé', description: 'Vous n\'avez pas les permissions nécessaires', variant: 'destructive' });
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
        attachments: newBlock.attachments as unknown as Database['public']['Tables']['blocks']['Insert']['attachments'],
        content_type: newBlock.contentType || 'section',
        tips_type: newBlock.tipsType,
        summary: newBlock.summary || '',
        show_summary: newBlock.showSummary !== false,
      }]);
      
      if (error) {
        logEditor.error('Erreur insertion Supabase:', error);
        throw error;
      }
      
      setBlocks((prev) => [...prev, newBlock]);
      return newBlock.id;
    } catch (error) {
      logEditor.error('Erreur sauvegarde:', error);
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder la catégorie', variant: 'destructive' });
      return '';
    }
  }, [blocks.length, toast, canEdit]);

  const updateBlock = useCallback(async (id: string, updates: Partial<Block>, options?: { allowContentDeletion?: boolean }) => {
    if (!canEdit) {
      toast({ title: 'Accès refusé', description: 'Vous n\'avez pas les permissions nécessaires', variant: 'destructive' });
      return;
    }
    
    // 🔒 VERROU DE SÉCURITÉ : empêcher le vidage accidentel du contenu
    if (updates.content !== undefined) {
      const existingBlock = blocks.find(b => b.id === id);
      
      if (existingBlock && existingBlock.content && existingBlock.content.trim().length > 0) {
        const newContent = updates.content?.trim() || '';
        
        // Si on essaie de vider un contenu existant SANS autorisation explicite
        if (newContent.length === 0 && !options?.allowContentDeletion) {
          logEditor.error('TENTATIVE DE VIDAGE DE CONTENU BLOQUÉE:', {
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
      const updateData: BlockUpdate = {};
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.content !== undefined) updateData.content = updates.content;
      if (updates.slug !== undefined) updateData.slug = updates.slug;
      if (updates.icon !== undefined) updateData.icon = updates.icon;
      if (updates.colorPreset !== undefined) updateData.color_preset = updates.colorPreset;
      if (updates.order !== undefined) updateData.order = updates.order;
      if (updates.parentId !== undefined) updateData.parent_id = updates.parentId;
      if (updates.hideFromSidebar !== undefined) updateData.hide_from_sidebar = updates.hideFromSidebar;
      if (updates.hideTitle !== undefined) updateData.hide_title = updates.hideTitle;
      if (updates.attachments !== undefined) updateData.attachments = updates.attachments as unknown as BlockUpdate['attachments'];
      if (updates.contentType !== undefined) updateData.content_type = updates.contentType;
      if (updates.tipsType !== undefined) updateData.tips_type = updates.tipsType;
      if (updates.summary !== undefined) updateData.summary = updates.summary;
      if (updates.showSummary !== undefined) updateData.show_summary = updates.showSummary;
      if (updates.isInProgress !== undefined) updateData.is_in_progress = updates.isInProgress;
      if (updates.completedAt !== undefined) updateData.completed_at = updates.completedAt;
      if (updates.contentUpdatedAt !== undefined) updateData.content_updated_at = updates.contentUpdatedAt;
      if (updates.isEmpty !== undefined) updateData.is_empty = updates.isEmpty;
      
      const { error } = await supabase
        .from('blocks')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
      
      setBlocks((prev) =>
        prev.map((block) => (block.id === id ? { ...block, ...updates } : block))
      );
      
      logEditor.debug('Bloc mis à jour avec succès:', id);
    } catch (error) {
      logEditor.error('Erreur mise à jour:', error);
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder les modifications', variant: 'destructive' });
    }
  }, [canEdit, toast, blocks]);

  const deleteBlock = useCallback(async (id: string) => {
    if (!canEdit) {
      toast({ title: 'Accès refusé', description: 'Vous n\'avez pas les permissions nécessaires', variant: 'destructive' });
      return;
    }
    
    const blockToDelete = blocks.find(b => b.id === id);
    const contentLength = blockToDelete?.content?.replace(/<[^>]*>/g, '').trim().length || 0;
    
    // Si le contenu est vide ou très court (< 50 caractères), on supprime définitivement
    // Sinon, on archive pour éviter les pertes accidentelles
    const shouldDeletePermanently = contentLength < 50;
    
    try {
      if (shouldDeletePermanently) {
        // Suppression définitive
        const { error } = await supabase
          .from('blocks')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        
        setBlocks((prev) => prev.filter((block) => block.id !== id));
        toast({ title: 'Bloc supprimé', description: 'Le bloc a été supprimé définitivement.' });
      } else {
        // Archivage (pour contenu significatif)
        const { error } = await supabase
          .from('blocks')
          .update({ hide_from_sidebar: true })
          .eq('id', id);
        
        if (error) throw error;
        
        setBlocks((prev) => prev.filter((block) => block.id !== id));
        toast({ title: 'Bloc archivé', description: 'Le contenu est conservé en base mais masqué.' });
      }
    } catch (error) {
      logEditor.error('Erreur suppression:', error);
      toast({ title: 'Erreur', description: 'Impossible de supprimer le bloc', variant: 'destructive' });
    }
  }, [toast, canEdit, blocks]);

  const reorderBlocks = useCallback(async (blocksToReorder: Block[]) => {
    if (!canEdit) {
      toast({ title: 'Accès refusé', description: 'Vous n\'avez pas les permissions nécessaires', variant: 'destructive' });
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
      
      logEditor.debug('Ordre sauvegardé dans Supabase');
    } catch (error) {
      logEditor.error('Erreur sauvegarde ordre:', error);
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder l\'ordre', variant: 'destructive' });
    }
  }, [canEdit, toast]);

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

  // Toggle manuel du mode édition
  const toggleEditMode = useCallback(() => {
    if (!canEdit) {
      toast({ title: 'Accès refusé', description: 'Vous n\'avez pas les permissions nécessaires', variant: 'destructive' });
      return;
    }
    setEditModeEnabled(prev => !prev);
  }, [canEdit, toast]);
  
  // Setter pour le mode édition
  const setIsEditMode = useCallback((mode: boolean) => {
    if (!canEdit && mode) {
      toast({ title: 'Accès refusé', description: 'Vous n\'avez pas les permissions nécessaires', variant: 'destructive' });
      return;
    }
    setEditModeEnabled(mode);
  }, [canEdit, toast]);

  const reloadBlocks = useCallback(async () => {
    setLoading(true);
    
    // Invalider le cache avec CacheManager
    CacheManager.removeItem(CACHE_KEY);

    try {
      const { data, error } = await supabase
        .from('blocks')
        .select('*')
        .order('order');

      if (error) throw error;

      if (data) {
        const transformedBlocks: Block[] = data.map((block) => ({
          id: block.id,
          type: block.type as Block['type'],
          title: block.title,
          slug: block.slug,
          content: block.content || '',
          parentId: block.parent_id,
          order: block.order,
          icon: block.icon,
          colorPreset: block.color_preset as Block['colorPreset'],
          hideFromSidebar: block.hide_from_sidebar || false,
          hideTitle: block.hide_title || false,
          attachments: (block.attachments || []) as unknown as Block['attachments'],
          contentType: (block.content_type || 'section') as Block['contentType'],
          tipsType: block.tips_type as Block['tipsType'],
          summary: block.summary || '',
          showSummary: block.show_summary !== false,
        }));

        setBlocks(transformedBlocks);
        
        // Mettre à jour le cache avec CacheManager
        CacheManager.setItem(CACHE_KEY, transformedBlocks, CACHE_TTL);
        
        logEditor.info(`${transformedBlocks.length} blocks rechargés`);
      }
    } catch (error) {
      logEditor.error('Erreur rechargement:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de recharger les données',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return (
    <EditorContext.Provider
      value={{
        blocks,
        isEditMode,
        canEdit,
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
