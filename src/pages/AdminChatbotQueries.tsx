import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ChatbotQuery {
  id: string;
  user_pseudo: string;
  question: string;
  answer: string | null;
  is_incomplete: boolean;
  status: string;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export default function AdminChatbotQueries() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [queries, setQueries] = useState<ChatbotQuery[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('all');
  const [editingNotes, setEditingNotes] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    loadQueries();
  }, [isAdmin, navigate]);

  const loadQueries = async () => {
    try {
      const { data, error } = await supabase
        .from('chatbot_queries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQueries(data || []);
    } catch (error) {
      console.error('Erreur chargement requêtes:', error);
    }
  };

  const updateQueryStatus = async (queryId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('chatbot_queries')
        .update({ status: newStatus, reviewed_by: (await supabase.auth.getUser()).data.user?.id })
        .eq('id', queryId);

      if (error) throw error;

      toast({
        title: 'Statut mis à jour',
        description: `Requête marquée comme ${newStatus === 'resolved' ? 'résolue' : 'en cours de révision'}`,
      });

      loadQueries();
    } catch (error) {
      console.error('Erreur mise à jour statut:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le statut',
        variant: 'destructive',
      });
    }
  };

  const saveAdminNotes = async (queryId: string) => {
    try {
      const { error } = await supabase
        .from('chatbot_queries')
        .update({ admin_notes: editingNotes[queryId] })
        .eq('id', queryId);

      if (error) throw error;

      toast({
        title: 'Notes sauvegardées',
        description: 'Les notes administratives ont été enregistrées',
      });

      setEditingNotes((prev) => {
        const newNotes = { ...prev };
        delete newNotes[queryId];
        return newNotes;
      });

      loadQueries();
    } catch (error) {
      console.error('Erreur sauvegarde notes:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder les notes',
        variant: 'destructive',
      });
    }
  };

  const filteredQueries = queries.filter((q) => {
    if (filter === 'all') return true;
    return q.status === filter;
  });

  const pendingCount = queries.filter((q) => q.status === 'pending').length;

  return (
    <div className="container max-w-7xl mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="w-8 h-8" />
            Mme MICHU - Questions
          </h1>
          <p className="text-muted-foreground mt-2">
            Gérer les questions posées au chatbot
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="destructive" className="text-lg px-4 py-2">
            {pendingCount} en attente
          </Badge>
        )}
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Toutes ({queries.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            <AlertCircle className="w-4 h-4" />
            En attente ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="resolved" className="gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Résolues ({queries.filter((q) => q.status === 'resolved').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="space-y-4 mt-6">
          {filteredQueries.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Aucune requête dans cette catégorie
              </CardContent>
            </Card>
          ) : (
            filteredQueries.map((query) => (
              <Card key={query.id} className={query.is_incomplete ? 'border-l-4 border-l-destructive' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{query.user_pseudo}</CardTitle>
                        {query.is_incomplete && (
                          <Badge variant="destructive">Réponse incomplète</Badge>
                        )}
                        <Badge variant={query.status === 'resolved' ? 'default' : 'secondary'}>
                          {query.status === 'resolved' ? 'Résolue' : 'En attente'}
                        </Badge>
                      </div>
                      <CardDescription className="flex items-center gap-2 text-xs">
                        <Clock className="w-3 h-3" />
                        {format(new Date(query.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {query.status !== 'resolved' && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => updateQueryStatus(query.id, 'resolved')}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Marquer résolue
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Question :</h4>
                    <p className="text-sm bg-muted p-3 rounded">{query.question}</p>
                  </div>
                  
                  {query.answer && (
                    <div>
                      <h4 className="font-semibold mb-2">Réponse donnée :</h4>
                      <p className="text-sm bg-muted p-3 rounded whitespace-pre-wrap">{query.answer}</p>
                    </div>
                  )}

                  <div>
                    <h4 className="font-semibold mb-2">Notes administratives :</h4>
                    <Textarea
                      placeholder="Ajouter des notes internes..."
                      value={editingNotes[query.id] ?? query.admin_notes ?? ''}
                      onChange={(e) =>
                        setEditingNotes((prev) => ({ ...prev, [query.id]: e.target.value }))
                      }
                      className="min-h-[80px]"
                    />
                    {(editingNotes[query.id] !== undefined) && (
                      <Button
                        size="sm"
                        className="mt-2"
                        onClick={() => saveAdminNotes(query.id)}
                      >
                        Sauvegarder notes
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
