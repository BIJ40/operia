import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useEffect, useState } from 'react';

export function ImageModal() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Gestion des boutons avec data-image-modal (directement ou parent)
      const button = target.closest('[data-image-modal]') as HTMLElement;
      if (button) {
        e.preventDefault();
        e.stopPropagation();
        const url = button.getAttribute('data-image-modal');
        if (url) {
          setImageUrl(url);
        }
        return;
      }
      
      // Gestion des images directes (inline)
      if (target.tagName === 'IMG') {
        const img = target as HTMLImageElement;
        // Ignorer les images avec data-no-modal
        if (img.hasAttribute('data-no-modal')) {
          return;
        }
        // Ignorer les images dans un conteneur de redimensionnement (mode édition)
        if (img.closest('.resizable-image-wrapper')) {
          return;
        }
        // Ne pas ouvrir les petites icônes (favicon, etc.)
        if (img.naturalWidth > 100 && img.naturalHeight > 100) {
          e.preventDefault();
          setImageUrl(img.src);
        }
      }
    };

    // Utiliser la capture phase pour intercepter avant tout autre handler
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  return (
    <Dialog open={!!imageUrl} onOpenChange={(open) => !open && setImageUrl(null)}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        {imageUrl && (
          <img 
            src={imageUrl} 
            alt="Aperçu" 
            className="w-full h-auto rounded-lg"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
