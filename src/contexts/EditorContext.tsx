import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Block, AppData } from '@/types/block';
import { loadAppData, saveAppData } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import seedData from '@/data/seed.json';

interface EditorContextType {
  blocks: Block[];
  isEditMode: boolean;
  setIsEditMode: (mode: boolean) => void;
  addBlock: (block: Omit<Block, 'id' | 'order'>) => void;
  updateBlock: (id: string, updates: Partial<Block>) => void;
  deleteBlock: (id: string) => void;
  reorderBlocks: (blocks: Block[]) => void;
  exportData: () => Promise<string>;
  importData: (data: string) => Promise<void>;
  loading: boolean;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load data on mount
  useEffect(() => {
    loadAppData().then((data) => {
      if (data && data.blocks.length > 0) {
        setBlocks(data.blocks);
      } else {
        // Load seed data if no data exists
        const initialData = seedData as AppData;
        setBlocks(initialData.blocks);
        saveAppData(initialData);
      }
      setLoading(false);
    });
  }, []);

  // Auto-save
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        const appData: AppData = {
          blocks,
          version: '1.0',
          lastModified: Date.now(),
        };
        saveAppData(appData);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [blocks, loading]);

  const addBlock = useCallback((block: Omit<Block, 'id' | 'order'>) => {
    const newBlock: Block = {
      ...block,
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      order: blocks.length,
    };
    setBlocks((prev) => [...prev, newBlock]);
    toast({ title: 'Bloc ajouté' });
  }, [blocks.length, toast]);

  const updateBlock = useCallback((id: string, updates: Partial<Block>) => {
    setBlocks((prev) =>
      prev.map((block) => (block.id === id ? { ...block, ...updates } : block))
    );
  }, []);

  const deleteBlock = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((block) => block.id !== id));
    toast({ title: 'Bloc supprimé' });
  }, [toast]);

  const reorderBlocks = useCallback((newBlocks: Block[]) => {
    setBlocks(newBlocks.map((block, index) => ({ ...block, order: index })));
  }, []);

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

  return (
    <EditorContext.Provider
      value={{
        blocks,
        isEditMode,
        setIsEditMode,
        addBlock,
        updateBlock,
        deleteBlock,
        reorderBlocks,
        exportData: exportDataFn,
        importData: importDataFn,
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
