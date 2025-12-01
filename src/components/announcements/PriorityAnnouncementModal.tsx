import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useActiveAnnouncements, useMarkAnnouncement, PriorityAnnouncement } from '@/hooks/use-priority-announcements';
import { supabase } from '@/integrations/supabase/client';
import DOMPurify from 'dompurify';
import { Check, Clock, Megaphone } from 'lucide-react';

export function PriorityAnnouncementModal() {
  const { data: announcements, isLoading, isError } = useActiveAnnouncements();
  const { mutate: markAnnouncement, isPending } = useMarkAnnouncement();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Sécurité: s'assurer que announcements est un tableau valide
  const safeAnnouncements = Array.isArray(announcements) ? announcements : [];
  const currentAnnouncement = safeAnnouncements[currentIndex];
  const hasMore = safeAnnouncements.length > 0 && currentIndex < safeAnnouncements.length - 1;
  const isOpen = !isLoading && !isError && !!currentAnnouncement;

  // Charger l'image si présente
  useEffect(() => {
    if (currentAnnouncement?.image_path) {
      const { data } = supabase.storage
        .from('documents')
        .getPublicUrl(currentAnnouncement.image_path);
      setImageUrl(data.publicUrl);
    } else {
      setImageUrl(null);
    }
  }, [currentAnnouncement?.image_path]);

  const handleRead = () => {
    if (!currentAnnouncement) return;
    markAnnouncement(
      { announcementId: currentAnnouncement.id, status: 'read' },
      {
        onSuccess: () => {
          if (hasMore) {
            setCurrentIndex(prev => prev + 1);
          }
        },
      }
    );
  };

  const handleLater = () => {
    if (!currentAnnouncement) return;
    markAnnouncement(
      { announcementId: currentAnnouncement.id, status: 'later' },
      {
        onSuccess: () => {
          if (hasMore) {
            setCurrentIndex(prev => prev + 1);
          }
        },
      }
    );
  };

  // Reset index when announcements change
  useEffect(() => {
    setCurrentIndex(0);
  }, [safeAnnouncements.length]);

  // Ne pas afficher si pas d'annonce ou erreur
  if (!isOpen || !currentAnnouncement) return null;

  const hasImage = !!imageUrl;
  const sanitizedContent = DOMPurify.sanitize(currentAnnouncement.content || '');

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className={`${hasImage ? 'max-w-2xl' : 'max-w-lg'} max-h-[85vh] overflow-hidden flex flex-col`}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-2 text-primary">
            <Megaphone className="h-5 w-5" />
            <span className="text-sm font-medium">Information importante</span>
          {safeAnnouncements.length > 1 && (
              <span className="ml-auto text-xs text-muted-foreground">
                {currentIndex + 1} / {safeAnnouncements.length}
              </span>
            )}
          </div>
          <DialogTitle className="text-xl">{currentAnnouncement.title}</DialogTitle>
          <DialogDescription className="sr-only">
            Annonce prioritaire à lire
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Image optionnelle */}
          {hasImage && (
            <div className="rounded-lg overflow-hidden border bg-muted/30">
              <img
                src={imageUrl}
                alt={currentAnnouncement.title}
                className="w-full h-auto max-h-64 object-contain"
              />
            </div>
          )}

          {/* Contenu riche */}
          <div 
            className="prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          />
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleLater}
            disabled={isPending}
            className="flex-1"
          >
            <Clock className="h-4 w-4 mr-2" />
            Plus tard
          </Button>
          <Button
            onClick={handleRead}
            disabled={isPending}
            className="flex-1"
          >
            <Check className="h-4 w-4 mr-2" />
            J'ai lu
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
