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
  // Track des annonces vues pendant cette session (pour "Plus tard")
  const [viewedInSession, setViewedInSession] = useState<Set<string>>(new Set());

  // Filtrer les annonces non vues dans cette session
  const displayAnnouncements = unreadAnnouncements.filter(
    (a) => !viewedInSession.has(a.id)
  );

  const currentAnnouncement = displayAnnouncements[currentIndex];

  // Ouvrir la modale s'il y a des annonces non lues
  useEffect(() => {
    if (displayAnnouncements.length > 0 && !isOpen) {
      setIsOpen(true);
      setCurrentIndex(0);
    }
  }, [displayAnnouncements.length, isOpen]);

  const handleRead = async () => {
    if (!currentAnnouncement) return;

    // Fermer la modale immédiatement pour éviter le "tremblement"
    setIsOpen(false);
    
    // Marquer comme lu en DB (ne réapparaîtra pas)
    await markAsRead.mutateAsync({
      announcementId: currentAnnouncement.id,
      userId,
      status: 'read',
    });

    // Reset l'index pour la prochaine ouverture
    setCurrentIndex(0);
    // Le useEffect rouvrira la modale s'il reste des annonces non lues
  };

  const handleLater = () => {
    if (!currentAnnouncement) return;

    // Marquer comme vue dans cette session uniquement (réapparaîtra à la prochaine connexion)
    setViewedInSession((prev) => new Set([...prev, currentAnnouncement.id]));

    // Si c'était la dernière, fermer la modale et reset l'index
    if (currentIndex >= displayAnnouncements.length - 1) {
      setIsOpen(false);
      setCurrentIndex(0);
    }
    // Sinon, l'annonce suivante s'affichera automatiquement au même index
  };

  if (!currentAnnouncement) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleLater(); }}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-helpconfort-blue" />
            <DialogTitle className="text-xl">{currentAnnouncement.title}</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {displayAnnouncements.length > 1 && (
              <span>Annonce {currentIndex + 1} sur {displayAnnouncements.length}</span>
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
