import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Monitor, MonitorOff, MousePointer2, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
  userName: string;
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

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
  const [isConnecting, setIsConnecting] = useState(false);
  const [remoteCursor, setRemoteCursor] = useState<CursorPosition | null>(null);
  const [hasConsent, setHasConsent] = useState(false);
  const [peerConnected, setPeerConnected] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const userName = profile?.first_name || 'Utilisateur';
  const channelName = `screen-share-${ticketId}`;

  // Cleanup function
  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsSharing(false);
    setPeerConnected(false);
    setIsConnecting(false);
  }, []);

  // Setup signaling channel
  useEffect(() => {
    const channel = supabase.channel(channelName);

    channel
      .on('broadcast', { event: 'webrtc-offer' }, async ({ payload }) => {
        if (isAgent && pcRef.current) {
          console.log('Agent received offer');
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          const answer = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(answer);
          channel.send({
            type: 'broadcast',
            event: 'webrtc-answer',
            payload: { sdp: answer }
          });
        }
      })
      .on('broadcast', { event: 'webrtc-answer' }, async ({ payload }) => {
        if (!isAgent && pcRef.current) {
          console.log('User received answer');
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        }
      })
      .on('broadcast', { event: 'webrtc-ice' }, async ({ payload }) => {
        if (pcRef.current && payload.candidate) {
          console.log('Received ICE candidate');
          await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
        }
      })
      .on('broadcast', { event: 'cursor-move' }, ({ payload }) => {
        if (!isAgent && payload.isAgent) {
          setRemoteCursor(payload);
        }
      })
      .on('broadcast', { event: 'share-started' }, () => {
        if (isAgent) {
          console.log('Share started signal received');
          initAgentConnection();
        }
      })
      .on('broadcast', { event: 'share-stopped' }, () => {
        if (isAgent) {
          cleanup();
          toast.info('L\'utilisateur a arrêté le partage');
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [ticketId, isAgent, cleanup]);

  // Initialize agent's peer connection (viewer)
  const initAgentConnection = useCallback(async () => {
    setIsConnecting(true);
    
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    pc.ontrack = (event) => {
      console.log('Agent received track', event.streams);
      if (videoRef.current && event.streams[0]) {
        videoRef.current.srcObject = event.streams[0];
        setPeerConnected(true);
        setIsConnecting(false);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'webrtc-ice',
          payload: { candidate: event.candidate }
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Agent connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setPeerConnected(true);
        setIsConnecting(false);
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        cleanup();
      }
    };

    // Add transceiver to receive video
    pc.addTransceiver('video', { direction: 'recvonly' });
  }, [cleanup]);

  // Start screen sharing (user side)
  const startScreenShare = async () => {
    try {
      setIsConnecting(true);
      
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });

      streamRef.current = stream;

      // Show local preview
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Create peer connection
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;

      // Add video track
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate && channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'webrtc-ice',
            payload: { candidate: event.candidate }
          });
        }
      };

      pc.onconnectionstatechange = () => {
        console.log('User connection state:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          setPeerConnected(true);
          setIsConnecting(false);
        }
      };

      // Handle stream end (user stops sharing via browser)
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      // Notify agent that sharing started
      channelRef.current?.send({
        type: 'broadcast',
        event: 'share-started',
        payload: {}
      });

      // Wait a bit for agent to set up, then create offer
      setTimeout(async () => {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        channelRef.current?.send({
          type: 'broadcast',
          event: 'webrtc-offer',
          payload: { sdp: offer }
        });
      }, 500);

      setIsSharing(true);
      toast.success('Partage d\'écran activé');

      // Send system message
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
      cleanup();
    }
  };

  const stopScreenShare = async () => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'share-stopped',
      payload: {}
    });
    cleanup();
    toast.info('Partage d\'écran arrêté');
  };

  // Track and send cursor position (agent only)
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current || !channelRef.current || !isAgent) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    channelRef.current.send({
      type: 'broadcast',
      event: 'cursor-move',
      payload: { x, y, userName, isAgent: true }
    });
  }, [isAgent, userName]);

  const handleConsent = () => {
    setHasConsent(true);
  };

  // User view - consent screen
  if (!isAgent && !hasConsent) {
    return (
      <div className="fixed inset-0 z-[9999] bg-background flex items-center justify-center p-4">
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

  // User view - sharing screen
  if (!isAgent) {
    return (
      <div className="fixed inset-0 z-[9999] bg-background flex flex-col">
        <div className="flex items-center justify-between p-4 border-b bg-background">
          <div className="flex items-center gap-3">
            <Monitor className="h-5 w-5 text-helpconfort-blue" />
            <span className="font-medium">Diagnostic en cours</span>
            {peerConnected && (
              <span className="text-xs bg-green-500/20 text-green-600 px-2 py-0.5 rounded">
                Agent connecté
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isSharing ? (
              <Button variant="destructive" size="sm" onClick={stopScreenShare}>
                <MonitorOff className="h-4 w-4 mr-2" />
                Arrêter le partage
              </Button>
            ) : (
              <Button 
                size="sm" 
                onClick={startScreenShare} 
                className="bg-helpconfort-blue hover:bg-helpconfort-blue/90"
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Monitor className="h-4 w-4 mr-2" />
                )}
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
          className="flex-1 relative bg-muted/20 flex items-center justify-center"
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
              {/* Remote cursor overlay (agent's pointer) - only show when sharing */}
              {remoteCursor && (
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
            <div className="text-center p-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-helpconfort-blue/10 flex items-center justify-center">
                <Monitor className="h-10 w-10 text-helpconfort-blue" />
              </div>
              <p className="text-lg font-medium mb-2">Prêt pour le diagnostic</p>
              <p className="text-muted-foreground">Cliquez sur "Démarrer le partage" pour permettre à l'agent de voir votre écran</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Agent view - watch stream + point
  return (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col">
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-3">
          <Monitor className="h-5 w-5 text-helpconfort-orange" />
          <span className="font-medium">Visualisation écran utilisateur</span>
          <span className="text-xs bg-green-500/20 text-green-600 px-2 py-0.5 rounded">
            Mode agent
          </span>
          {peerConnected && (
            <span className="text-xs bg-helpconfort-blue/20 text-helpconfort-blue px-2 py-0.5 rounded">
              Connecté
            </span>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={() => { cleanup(); onClose(); }}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div 
        ref={containerRef}
        className="flex-1 relative bg-black flex items-center justify-center cursor-crosshair"
        onMouseMove={handleMouseMove}
      >
        {peerConnected ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="max-w-full max-h-full object-contain"
          />
        ) : isConnecting ? (
          <div className="text-center text-muted-foreground">
            <Loader2 className="h-16 w-16 mx-auto mb-4 animate-spin opacity-50" />
            <p>Connexion au partage d'écran...</p>
          </div>
        ) : (
          <div className="text-center text-muted-foreground">
            <Monitor className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p>En attente du partage d'écran de l'utilisateur...</p>
            <p className="text-sm mt-2">L'utilisateur doit démarrer le partage de son côté</p>
          </div>
        )}
      </div>
    </div>
  );
}
