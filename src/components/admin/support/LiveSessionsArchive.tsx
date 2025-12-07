/**
 * LiveSessionsArchive - Liste des sessions de chat live archivées
 * Affiche les sessions fermées avec leur historique
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  User, 
  Clock, 
  Loader2, 
  Archive,
  CheckCircle,
  Ticket,
  MessageSquare,
  Headphones,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface LiveSession {
  id: string;
  user_id: string;
  user_name: string | null;
  agency_slug: string | null;
  agent_name: string | null;
  status: string;
  created_at: string;
  closed_at: string | null;
}

interface LiveMessage {
  id: string;
  content: string;
  sender_name: string;
  is_from_support: boolean;
  created_at: string;
}

export function LiveSessionsArchive() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<LiveSession | null>(null);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Charger les sessions archivées
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const { data, error } = await supabase
          .from('live_support_sessions')
          .select('*')
          .in('status', ['closed', 'converted'])
          .order('closed_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        setSessions(data || []);
      } catch (error) {
        console.error('Error loading archived sessions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSessions();
  }, []);

  // Charger les messages d'une session
  const handleViewSession = async (session: LiveSession) => {
    setSelectedSession(session);
    setLoadingMessages(true);
    
    try {
      const { data, error } = await supabase
        .from('live_support_messages')
        .select('*')
        .eq('session_id', session.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Archive className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">Aucune session archivée</p>
        <p className="text-sm text-muted-foreground/70">
          Les sessions fermées apparaîtront ici
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {sessions.map((session) => (
          <Card 
            key={session.id} 
            className={cn(
              "border-l-4 cursor-pointer hover:shadow-md transition-all",
              session.status === 'converted' 
                ? "border-l-helpconfort-blue" 
                : "border-l-green-500"
            )}
            onClick={() => handleViewSession(session)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    session.status === 'converted'
                      ? "bg-helpconfort-blue/10"
                      : "bg-green-100 dark:bg-green-900/30"
                  )}>
                    {session.status === 'converted' ? (
                      <Ticket className="w-5 h-5 text-helpconfort-blue" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{session.user_name || 'Utilisateur'}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {session.agency_slug && (
                        <span>{session.agency_slug}</span>
                      )}
                      {session.agent_name && (
                        <>
                          <span>•</span>
                          <span>Agent: {session.agent_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline"
                    className={cn(
                      session.status === 'converted'
                        ? "border-helpconfort-blue/50 text-helpconfort-blue"
                        : "border-green-500/50 text-green-600"
                    )}
                  >
                    {session.status === 'converted' ? 'Converti en ticket' : 'Résolu'}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {session.closed_at && formatDistanceToNow(new Date(session.closed_at), { 
                      addSuffix: true, 
                      locale: fr 
                    })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog pour voir l'historique */}
      <Dialog open={!!selectedSession} onOpenChange={(open) => !open && setSelectedSession(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Historique - {selectedSession?.user_name || 'Utilisateur'}
              {selectedSession?.status === 'converted' && (
                <Badge className="bg-helpconfort-blue ml-2">Converti en ticket</Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="text-sm text-muted-foreground mb-2">
            Session du {selectedSession?.created_at && format(new Date(selectedSession.created_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
            {selectedSession?.agent_name && ` • Agent: ${selectedSession.agent_name}`}
          </div>

          <ScrollArea className="flex-1 max-h-[50vh] border rounded-lg p-4">
            {loadingMessages ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Aucun message dans cette session
              </p>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex items-start gap-2",
                      msg.is_from_support ? "justify-end" : "justify-start"
                    )}
                  >
                    {!msg.is_from_support && (
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex flex-col gap-1 max-w-[70%]">
                      {!msg.is_from_support && (
                        <span className="text-xs text-muted-foreground ml-1">
                          {msg.sender_name}
                        </span>
                      )}
                      <div
                        className={cn(
                          "p-3 rounded-lg text-sm",
                          msg.is_from_support
                            ? "bg-helpconfort-blue text-white"
                            : "bg-muted"
                        )}
                      >
                        {msg.content}
                      </div>
                      <span className="text-[10px] text-muted-foreground ml-1">
                        {format(new Date(msg.created_at), 'HH:mm', { locale: fr })}
                      </span>
                    </div>
                    {msg.is_from_support && (
                      <div className="w-8 h-8 rounded-full bg-helpconfort-blue flex items-center justify-center flex-shrink-0">
                        <Headphones className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
