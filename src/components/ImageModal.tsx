import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useEffect, useState } from 'react';

type OpenImageModalEvent = CustomEvent<{ url?: string }>;

function getTargetElement(target: EventTarget | null): HTMLElement | null {
  if (target instanceof HTMLElement) return target;
  if (target instanceof SVGElement) return target as unknown as HTMLElement;
  if (target instanceof Node) return target.parentElement;
  return null;
}

function isImageHref(url: string | null): url is string {
  return !!url && (
    url.startsWith('data:image/') ||
    /\.(png|jpe?g|gif|webp|svg)(\?|#|$)/i.test(url)
  );
}

function resolveImageUrl(target: EventTarget | null): string | null {
  const targetElement = getTargetElement(target);
  if (!targetElement) return null;

  const imageTrigger = targetElement.closest('[data-image-modal], [data-image-button], [data-src], a[href], img') as HTMLElement | null;
  if (!imageTrigger) return null;

  if (imageTrigger instanceof HTMLAnchorElement) {
    const href = imageTrigger.getAttribute('href');
    if (isImageHref(href)) return href;
  }

  if (imageTrigger instanceof HTMLImageElement) {
    if (imageTrigger.hasAttribute('data-no-modal')) return null;
    if (imageTrigger.closest('.resizable-image-wrapper')) return null;
    return imageTrigger.currentSrc || imageTrigger.src || null;
  }

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
      const triggerUrl = resolveImageUrl(e.target);

      if (!triggerUrl) return;

      e.preventDefault();
      e.stopPropagation();
      setImageUrl(triggerUrl);
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
