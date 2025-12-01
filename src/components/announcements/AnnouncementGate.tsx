import { useState, useEffect } from 'react';
import { useUnreadAnnouncements, useMarkAnnouncementAsRead } from '@/hooks/use-announcements';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import DOMPurify from 'dompurify';

interface AnnouncementGateProps {
  userId: string;
}

/**
 * Composant global qui affiche les annonces prioritaires non lues
 * à la connexion de l'utilisateur
 */
export function AnnouncementGate({ userId }: AnnouncementGateProps) {
  const { data: unreadAnnouncements = [] } = useUnreadAnnouncements(userId);
  const markAsRead = useMarkAnnouncementAsRead();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const currentAnnouncement = unreadAnnouncements[currentIndex];

  // Ouvrir la modale s'il y a des annonces non lues
  useEffect(() => {
    if (unreadAnnouncements.length > 0 && !isOpen) {
      setIsOpen(true);
      setCurrentIndex(0);
    }
  }, [unreadAnnouncements.length, isOpen]);

  const handleRead = async () => {
    if (!currentAnnouncement) return;

    await markAsRead.mutateAsync({
      announcementId: currentAnnouncement.id,
      userId,
      status: 'read',
    });

    // Passer à l'annonce suivante ou fermer
    if (currentIndex < unreadAnnouncements.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsOpen(false);
      setCurrentIndex(0);
    }
  };

  const handleLater = async () => {
    if (!currentAnnouncement) return;

    await markAsRead.mutateAsync({
      announcementId: currentAnnouncement.id,
      userId,
      status: 'later',
    });

    // Passer à l'annonce suivante ou fermer
    if (currentIndex < unreadAnnouncements.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsOpen(false);
      setCurrentIndex(0);
    }
  };

  if (!currentAnnouncement) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-helpconfort-blue" />
            <DialogTitle className="text-xl">{currentAnnouncement.title}</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {unreadAnnouncements.length > 1 && (
              <span>Annonce {currentIndex + 1} sur {unreadAnnouncements.length}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {currentAnnouncement.image_path && (
            <img
              src={currentAnnouncement.image_path}
              alt={currentAnnouncement.title}
              className="w-full rounded-lg max-h-64 object-cover"
            />
          )}

          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(currentAnnouncement.content, {
                ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'a'],
                ALLOWED_ATTR: ['href', 'target', 'rel'],
              }),
            }}
          />
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleLater}
            disabled={markAsRead.isPending}
          >
            Plus tard
          </Button>
          <Button
            onClick={handleRead}
            disabled={markAsRead.isPending}
            className="bg-helpconfort-blue hover:bg-helpconfort-blue/90"
          >
            J'ai lu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
