import { useEffect, useRef, useState } from 'react';
import { useEditor } from '@/contexts/EditorContext';

interface UseContentLoaderOptions {
  blockId: string;
  enabled?: boolean;
  threshold?: number; // Distance from viewport to trigger preload (0-1)
}

export const useContentLoader = ({ 
  blockId, 
  enabled = true,
  threshold = 0.5 // Start loading when element is 50% close to viewport
}: UseContentLoaderOptions) => {
  const { loadBlockContent, blocks } = useEditor();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;

    const element = elementRef.current;
    if (!element) return;

    // Check if content is already loaded
    const block = blocks.find(b => b.id === blockId);
    if (block?.content && block.content.length > 0) {
      setIsLoaded(true);
      return;
    }

    const observer = new IntersectionObserver(
      async (entries) => {
        const [entry] = entries;
        
        // Load content when element is approaching viewport
        if (entry.isIntersecting && !isLoaded && !isLoading) {
          setIsLoading(true);
          
          try {
            await loadBlockContent(blockId);
            setIsLoaded(true);
          } catch (error) {
            console.error('Failed to load content:', error);
          } finally {
            setIsLoading(false);
          }
        }
      },
      {
        root: null, // viewport
        rootMargin: `${threshold * 100}%`, // Preload when X% away from viewport
        threshold: 0
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [blockId, blocks, enabled, isLoaded, isLoading, loadBlockContent, threshold]);

  return {
    elementRef,
    isLoaded,
    isLoading,
    content: blocks.find(b => b.id === blockId)?.content || ''
  };
};
