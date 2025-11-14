import { createContext, useContext, ReactNode, useState, useCallback, useEffect } from 'react';
import { Block } from '@/types/block';
import { loadApporteurData, saveApporteurData, exportApporteurData, importApporteurData } from '@/lib/db-apporteurs';
import { useAuth } from './AuthContext';

interface ApporteurEditorContextType {
  blocks: Block[];
  isEditMode: boolean;
  loading: boolean;
  addBlock: (block: Omit<Block, 'id' | 'order'>) => string;
  updateBlock: (id: string, updates: Partial<Block>) => void;
  deleteBlock: (id: string) => void;
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

  // Sauvegarde automatique
  useEffect(() => {
    if (!loading && blocks.length > 0) {
      const saveTimer = setTimeout(() => {
        saveApporteurData({ blocks, version: '1.0', lastModified: Date.now() })
          .catch(err => console.error('Erreur sauvegarde auto:', err));
      }, 1000);
      return () => clearTimeout(saveTimer);
    }
  }, [blocks, loading]);

  const addBlock = useCallback((block: Omit<Block, 'id' | 'order'>): string => {
    if (!isAdmin) return '';
    
    const newId = crypto.randomUUID();
    const maxOrder = blocks.reduce((max, b) => Math.max(max, b.order), -1);
    
    const newBlock: Block = {
      ...block,
      id: newId,
      order: maxOrder + 1,
    };
    
    setBlocks(prev => [...prev, newBlock]);
    return newId;
  }, [blocks, isAdmin]);

  const updateBlock = useCallback((id: string, updates: Partial<Block>) => {
    if (!isAdmin) return;
    
    setBlocks(prev => prev.map(block => 
      block.id === id ? { ...block, ...updates } : block
    ));
  }, [isAdmin]);

  const deleteBlock = useCallback((id: string) => {
    if (!isAdmin) return;
    
    setBlocks(prev => {
      const filtered = prev.filter(block => {
        if (block.id === id) return false;
        if (block.parentId === id) return false;
        return true;
      });
      return filtered;
    });
  }, [isAdmin]);

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
