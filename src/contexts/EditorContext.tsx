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
  addBlock: (block: Omit<Block, 'id' | 'order'>) => string;
  updateBlock: (id: string, updates: Partial<Block>) => void;
  deleteBlock: (id: string) => void;
  reorderBlocks: (blocks: Block[]) => void;
  exportData: () => Promise<string>;
  importData: (data: string) => Promise<void>;
  resetToDefault: () => void;
  loading: boolean;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export function EditorProvider({ children }: { children: ReactNode }) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  // Load data on mount
  useEffect(() => {
    const initData = async () => {
      console.log('🔄 Chargement des données...');
      
      // Importer et restaurer depuis le backup JSON
      const apogeeData = await import('../data/apogee-data.json');
      
      if (apogeeData.default && apogeeData.default.blocks) {
        const blocks = apogeeData.default.blocks as Block[];
        
        // Restaurer dans Supabase
        await supabase.from('blocks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        
        const blocksToInsert = blocks.map(block => ({
          id: block.id,
          type: block.type,
          title: block.title,
          content: block.content || '',
          icon: block.icon || null,
          color_preset: block.colorPreset || 'white',
          order: block.order || 0,
          slug: block.slug,
          parent_id: block.parentId || null,
          attachments: (block.attachments || []) as any,
          hide_from_sidebar: block.hideFromSidebar || false,
        }));
        
        await supabase.from('blocks').insert(blocksToInsert as any);
        setBlocks(blocks);
        console.log(`✅ ${blocks.length} blocks restaurés`);
      }
      
      setLoading(false);
    };
    
    initData();
  }, []);

  // Auto-save DÉSACTIVÉ temporairement pour éviter la perte de données
  // useEffect(() => {
  //   if (!loading) {
  //     const timer = setTimeout(() => {
  //       const appData: AppData = {
  //         blocks,
  //         version: '1.0',
  //         lastModified: Date.now(),
  //       };
  //       saveAppData(appData);
  //     }, 1000);

  //     return () => clearTimeout(timer);
  //   }
  // }, [blocks, loading]);

  const addBlock = useCallback((block: Omit<Block, 'id' | 'order'>): string => {
    if (!isAdmin) {
      toast({ title: 'Accès refusé', description: 'Seuls les administrateurs peuvent ajouter du contenu', variant: 'destructive' });
      return '';
    }
    const newBlock: Block = {
      ...block,
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      order: blocks.length,
    };
    setBlocks((prev) => [...prev, newBlock]);
    toast({ title: 'Bloc ajouté' });
    return newBlock.id;
  }, [blocks.length, toast, isAdmin]);

  const updateBlock = useCallback((id: string, updates: Partial<Block>) => {
    if (!isAdmin) {
      toast({ title: 'Accès refusé', description: 'Seuls les administrateurs peuvent modifier le contenu', variant: 'destructive' });
      return;
    }
    setBlocks((prev) =>
      prev.map((block) => (block.id === id ? { ...block, ...updates } : block))
    );
  }, [isAdmin, toast]);

  const deleteBlock = useCallback((id: string) => {
    if (!isAdmin) {
      toast({ title: 'Accès refusé', description: 'Seuls les administrateurs peuvent supprimer du contenu', variant: 'destructive' });
      return;
    }
    setBlocks((prev) => prev.filter((block) => block.id !== id));
    toast({ title: 'Bloc supprimé' });
  }, [toast, isAdmin]);

  const reorderBlocks = useCallback((newBlocks: Block[]) => {
    if (!isAdmin) {
      toast({ title: 'Accès refusé', description: 'Seuls les administrateurs peuvent réorganiser le contenu', variant: 'destructive' });
      return;
    }
    setBlocks(newBlocks.map((block, index) => ({ ...block, order: index })));
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
