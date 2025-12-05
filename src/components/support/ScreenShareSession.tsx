import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Monitor, MonitorOff, MousePointer2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

interface ScreenShareSessionProps {
  ticketId: string;
  isAgent?: boolean;
  onClose: () => void;
}

interface CursorPosition {
  x: number;
  y: number;
  userId: string;
  userName: string;
  isAgent: boolean;
}

export function ScreenShareSession({ ticketId, isAgent = false, onClose }: ScreenShareSessionProps) {
  const { user } = useAuth();
  const { data: profile } = useQuery({
    queryKey: ['profile-name', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from('profiles').select('first_name').eq('id', user.id).single();
      return data;
    },
    enabled: !!user?.id
  });
  const [isSharing, setIsSharing] = useState(false);
  const [remoteCursor, setRemoteCursor] = useState<CursorPosition | null>(null);
  const [hasConsent, setHasConsent] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const userName = profile?.first_name || 'Utilisateur';

  // Setup Realtime channel for cursor sharing
  useEffect(() => {
    const channel = supabase.channel(`screen-share-${ticketId}`, {
      config: { presence: { key: user?.id || 'anonymous' } }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        // Get the other participant's cursor
        Object.entries(state).forEach(([key, presences]) => {
          if (key !== user?.id && presences.length > 0) {
            const presence = presences[0] as unknown as CursorPosition;
            if (presence.x !== undefined) {
              setRemoteCursor(presence);
            }
          }
        });
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [ticketId, user?.id]);

  // Track and send cursor position
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current || !channelRef.current || !isAgent) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    channelRef.current.track({
      x,
      y,
      userId: user?.id,
      userName: userName,
      isAgent: true
    });
  }, [isAgent, user?.id, userName]);

  // Start screen sharing (user side)
  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Handle stream end (user stops sharing)
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      setIsSharing(true);
      toast.success('Partage d\'écran activé');

      // Notify agent that sharing started
      await supabase.from('support_messages').insert({
        ticket_id: ticketId,
        message: '🖥️ L\'utilisateur a démarré le partage d\'écran',
        is_from_support: false,
        is_system_message: true,
        sender_id: user?.id
      });

    } catch (error) {
      console.error('Error starting screen share:', error);
      toast.error('Impossible de démarrer le partage d\'écran');
    }
  };

  const stopScreenShare = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsSharing(false);
    toast.info('Partage d\'écran arrêté');
  };

  const handleConsent = () => {
    setHasConsent(true);
  };

  // User view - consent + start sharing
  if (!isAgent) {
    if (!hasConsent) {
      return (
        <div className="fixed inset-0 z-50 bg-background/95 flex items-center justify-center p-4">
          <div className="bg-card border rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-helpconfort-blue/10 flex items-center justify-center">
                <Monitor className="h-6 w-6 text-helpconfort-blue" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Diagnostic à distance</h3>
                <p className="text-sm text-muted-foreground">Partage d'écran avec le support</p>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
              <p className="font-medium">En acceptant, vous autorisez :</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Le partage de votre écran avec l'agent support</li>
                <li>L'agent pourra pointer des éléments sur votre écran</li>
                <li>Vous pouvez arrêter à tout moment</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Refuser
              </Button>
              <Button onClick={handleConsent} className="flex-1 bg-helpconfort-blue hover:bg-helpconfort-blue/90">
                Accepter
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-50 bg-background/95 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <Monitor className="h-5 w-5 text-helpconfort-blue" />
            <span className="font-medium">Diagnostic en cours</span>
          </div>
          <div className="flex items-center gap-2">
            {isSharing ? (
              <Button variant="destructive" size="sm" onClick={stopScreenShare}>
                <MonitorOff className="h-4 w-4 mr-2" />
                Arrêter le partage
              </Button>
            ) : (
              <Button size="sm" onClick={startScreenShare} className="bg-helpconfort-blue hover:bg-helpconfort-blue/90">
                <Monitor className="h-4 w-4 mr-2" />
                Démarrer le partage
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div 
          ref={containerRef}
          className="flex-1 relative bg-black flex items-center justify-center"
          onMouseMove={handleMouseMove}
        >
          {isSharing ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="max-w-full max-h-full object-contain"
              />
              {/* Remote cursor overlay */}
              {remoteCursor && remoteCursor.isAgent && (
                <div
                  className="absolute pointer-events-none z-10 transition-all duration-75"
                  style={{
                    left: `${remoteCursor.x}%`,
                    top: `${remoteCursor.y}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <div className="relative">
                    <MousePointer2 className="h-6 w-6 text-helpconfort-orange fill-helpconfort-orange/30 drop-shadow-lg" />
                    <span className="absolute left-6 top-0 bg-helpconfort-orange text-white text-xs px-2 py-0.5 rounded whitespace-nowrap">
                      {remoteCursor.userName}
                    </span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-muted-foreground">
              <Monitor className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p>Cliquez sur "Démarrer le partage" pour commencer</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Agent view - watch stream + point
  return (
    <div className="fixed inset-0 z-50 bg-background/95 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Monitor className="h-5 w-5 text-helpconfort-orange" />
          <span className="font-medium">Visualisation écran utilisateur</span>
          <span className="text-xs bg-green-500/20 text-green-600 px-2 py-0.5 rounded">
            Mode agent
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div 
        ref={containerRef}
        className="flex-1 relative bg-black flex items-center justify-center cursor-crosshair"
        onMouseMove={handleMouseMove}
      >
        <div className="text-center text-muted-foreground">
          <Monitor className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p>En attente du partage d'écran de l'utilisateur...</p>
          <p className="text-sm mt-2">Déplacez votre souris pour pointer des éléments</p>
        </div>
      </div>
    </div>
  );
}
