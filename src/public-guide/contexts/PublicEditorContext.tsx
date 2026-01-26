/**
 * PublicEditorContext - Contexte lecture seule pour le Guide Apogée public
 * Permet aux visiteurs anonymes de consulter les blocks sans authentification
 */

import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { Block } from '@/types/block';
import { supabase } from '@/integrations/supabase/client';

interface PublicEditorContextType {
  blocks: Block[];
  loading: boolean;
}

const PublicEditorContext = createContext<PublicEditorContextType | undefined>(undefined);

export function PublicEditorProvider({ children }: { children: ReactNode }) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBlocks = async () => {
      try {
        // Chargement des métadonnées sans contenu pour optimiser
        const { data, error } = await supabase
          .from('blocks')
          .select('id,type,title,slug,parent_id,order,icon,color_preset,hide_from_sidebar,hide_title,attachments,content_type,tips_type,summary,show_summary,is_in_progress,completed_at,content_updated_at,is_empty')
          .order('order');

        if (error) throw error;

        if (data && data.length > 0) {
          // Charger le contenu par lots pour éviter les timeouts
          const ids = data.map((b) => b.id);
          const batchSize = 50;
          const contentMap = new Map<string, string>();

          for (let i = 0; i < ids.length; i += batchSize) {
            const batchIds = ids.slice(i, i + batchSize);
            const { data: contentData, error: contentError } = await supabase
              .from('blocks')
              .select('id,content')
              .in('id', batchIds);

            if (contentError) throw contentError;
            contentData?.forEach((c) => contentMap.set(c.id, c.content || ''));
          }

          // Transformer les données pour correspondre à l'interface Block
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
