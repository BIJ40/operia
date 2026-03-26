import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useEffect, useState } from 'react';

type OpenImageModalEvent = CustomEvent<{ url?: string }>;

function resolveImageUrl(target: HTMLElement): string | null {
  const imageTrigger = target.closest('[data-image-modal], [data-image-button], [data-src]') as HTMLElement | null;
  if (!imageTrigger) return null;

  return imageTrigger.getAttribute('data-image-modal')
    || imageTrigger.getAttribute('data-src')
    || imageTrigger.closest('[data-image-button]')?.getAttribute('data-src')
    || imageTrigger.querySelector('[data-image-modal]')?.getAttribute('data-image-modal')
    || null;
}

export function ImageModal() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const triggerUrl = resolveImageUrl(target);

      if (triggerUrl) {
        e.preventDefault();
        e.stopPropagation();
        setImageUrl(triggerUrl);
        return;
      }

      if (target.tagName === 'IMG') {
        const img = target as HTMLImageElement;
        if (img.hasAttribute('data-no-modal')) return;
        if (img.closest('.resizable-image-wrapper')) return;

        if (img.naturalWidth > 100 && img.naturalHeight > 100) {
          e.preventDefault();
          setImageUrl(img.src);
        }
      }
    };

    const handleOpenImageModal = (event: Event) => {
      const customEvent = event as OpenImageModalEvent;
      const url = customEvent.detail?.url;
      if (url) {
        setImageUrl(url);
      }
    };

    document.addEventListener('click', handleClick, true);
    window.addEventListener('open-image-modal', handleOpenImageModal as EventListener);

    return () => {
      document.removeEventListener('click', handleClick, true);
      window.removeEventListener('open-image-modal', handleOpenImageModal as EventListener);
    };
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
