/**
 * PublicEditorContext - Contexte lecture seule pour le Guide Apogée public
 * Permet aux visiteurs anonymes de consulter les blocks sans authentification
 * Utilise la vue sécurisée 'blocks_public' pour éviter l'accès direct à la table blocks
 */

import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { Block } from '@/types/block';
import { supabase } from '@/integrations/supabase/client';

interface PublicEditorContextType {
  blocks: Block[];
  loading: boolean;
}

const PublicEditorContext = createContext<PublicEditorContextType | undefined>(undefined);

// Interface pour les données brutes de la vue blocks_public
interface BlockPublicRow {
  id: string;
  type: string;
  title: string;
  slug: string;
  content: string | null;
  parent_id: string | null;
  order: number;
  icon: string | null;
  color_preset: string | null;
  hide_from_sidebar: boolean | null;
  hide_title: boolean | null;
  attachments: unknown;
  content_type: string | null;
  tips_type: string | null;
  summary: string | null;
  show_summary: boolean | null;
  is_in_progress: boolean | null;
  completed_at: string | null;
  content_updated_at: string | null;
  is_empty: boolean | null;
}

export function PublicEditorProvider({ children }: { children: ReactNode }) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBlocks = async () => {
      try {
        // Utiliser la vue publique sécurisée blocks_public (accessible aux anonymes)
        // Note: on utilise 'as any' car la vue n'est pas dans les types générés
        const { data, error } = await supabase
          .from('blocks_public' as any)
          .select('*')
          .order('order');

        if (error) throw error;

        if (data && Array.isArray(data) && data.length > 0) {
          const rawBlocks = data as unknown as BlockPublicRow[];
          
          // Transformer les données pour correspondre à l'interface Block
          const transformedBlocks: Block[] = rawBlocks.map((block) => ({
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
            isInProgress: block.is_in_progress || false,
            completedAt: block.completed_at || undefined,
            contentUpdatedAt: block.content_updated_at || undefined,
            isEmpty: block.is_empty || false,
          }));

          setBlocks(transformedBlocks);
        }
      } catch (error) {
        console.error('Erreur chargement blocks publics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBlocks();
  }, []);

  const value = useMemo(() => ({ blocks, loading }), [blocks, loading]);

  return (
    <PublicEditorContext.Provider value={value}>
      {children}
    </PublicEditorContext.Provider>
  );
}

export function usePublicEditor() {
  const context = useContext(PublicEditorContext);
  if (context === undefined) {
    throw new Error('usePublicEditor must be used within a PublicEditorProvider');
  }
  return context;
}
