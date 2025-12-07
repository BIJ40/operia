/**
 * LiveSessionsList - Liste des sessions de chat live en attente/actives pour les agents support
 * Permet aux agents de voir et prendre en charge les demandes de chat en direct
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Headphones, User, Clock, MessageCircle, Loader2, Archive } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AgentLiveChatDialog } from './AgentLiveChatDialog';
import { LiveSessionsArchive } from './LiveSessionsArchive';

interface LiveSession {
  id: string;
  user_id: string;
  user_name: string | null;
  agency_slug: string | null;
  status: string;
  agent_id: string | null;
  created_at: string;
}

export function LiveSessionsList() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<LiveSession | null>(null);

  const [activeTab, setActiveTab] = useState<'active' | 'archive'>('active');

  // Charger les sessions
  const loadSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('live_support_sessions')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error loading live sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();

    // Écouter les changements en temps réel
    const channel = supabase
      .channel('agent-live-sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_support_sessions',
        },
        () => {
          loadSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleTakeSession = async (session: LiveSession) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('live_support_sessions')
        .update({ agent_id: user.id })
        .eq('id', session.id);

      if (error) throw error;

      toast.success('Session prise en charge');
      setSelectedSession({ ...session, agent_id: user.id });
    } catch (error) {
      console.error('Error taking session:', error);
      toast.error('Erreur lors de la prise en charge');
    }
  };

  const waitingSessions = sessions.filter(s => !s.agent_id);
  const mySessions = sessions.filter(s => s.agent_id === user?.id);
  const otherSessions = sessions.filter(s => s.agent_id && s.agent_id !== user?.id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'active' | 'archive')} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="active" className="flex items-center gap-1 px-3" title="En cours">
            <Headphones className="w-4 h-4" />
            {sessions.length > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">{sessions.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="archive" className="flex items-center gap-1 px-3" title="Archives">
            <Archive className="w-4 h-4" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-0">
          <div className="space-y-6">
            {/* Sessions en attente */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                En attente d'agent ({waitingSessions.length})
              </h3>
              
              {waitingSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucune demande en attente
                </p>
              ) : (
                <div className="space-y-2">
                  {waitingSessions.map((session) => (
                    <Card 
                      key={session.id} 
                      className="border-l-4 border-l-red-500 animate-pulse cursor-pointer hover:shadow-md transition-all"
                      onClick={() => handleTakeSession(session)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                              <Headphones className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                              <p className="font-medium">{session.user_name || 'Utilisateur'}</p>
                              {session.agency_slug && (
                                <p className="text-xs text-muted-foreground">
                                  Agence: {session.agency_slug}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive" className="animate-pulse">
                              En attente
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(session.created_at), 'HH:mm', { locale: fr })}
                            </span>
                          </div>
                        </div>
                        <Button 
                          className="w-full mt-3 bg-red-600 hover:bg-red-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTakeSession(session);
                          }}
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Prendre en charge
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Mes sessions actives */}
            {mySessions.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  Mes conversations ({mySessions.length})
                </h3>
                <div className="space-y-2">
                  {mySessions.map((session) => (
                    <Card 
                      key={session.id} 
                      className="border-l-4 border-l-green-500 cursor-pointer hover:shadow-md transition-all"
                      onClick={() => setSelectedSession(session)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                              <User className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium">{session.user_name || 'Utilisateur'}</p>
                              {session.agency_slug && (
                                <p className="text-xs text-muted-foreground">
                                  Agence: {session.agency_slug}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge className="bg-green-500">En cours</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Sessions prises par d'autres */}
            {otherSessions.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  Prises en charge par d'autres ({otherSessions.length})
                </h3>
                <div className="space-y-2 opacity-60">
                  {otherSessions.map((session) => (
                    <Card key={session.id} className="border-l-4 border-l-gray-400">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                              <User className="w-5 h-5 text-gray-500" />
                            </div>
                            <div>
                              <p className="font-medium">{session.user_name || 'Utilisateur'}</p>
                              {session.agency_slug && (
                                <p className="text-xs text-muted-foreground">
                                  Agence: {session.agency_slug}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline">Pris en charge</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="archive" className="mt-0">
          <LiveSessionsArchive />
        </TabsContent>
      </Tabs>

      {/* Dialog pour le chat agent */}
      <AgentLiveChatDialog 
        session={selectedSession}
        onClose={() => {
          setSelectedSession(null);
          loadSessions(); // Recharger après fermeture
        }}
      />
    </>
  );
}
