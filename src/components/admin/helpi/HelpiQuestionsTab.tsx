import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, MessageSquare, RefreshCw, CheckCircle2, Clock, Eye, AlertCircle, BookPlus } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { logError } from '@/lib/logger';
import { safeQuery, safeMutation } from '@/lib/safeQuery';
import { errorToast, successToast } from '@/lib/toastHelpers';
import { ImproveGuideDialog } from './ImproveGuideDialog';

type ChatQuery = {
  id: string;
  question: string;
  answer: string | null;
  status: string | null;
  created_at: string | null;
  admin_notes: string | null;
  context_found: string | null;
  chat_context: string | null;
  is_incomplete: boolean | null;
  answer_raw?: string | null;
  context_type_used?: string | null;
  apporteur_code_used?: string | null;
  univers_code_used?: string | null;
  role_cible_used?: string | null;
  improvement_block_id?: string | null;
};

export function HelpiQuestionsTab() {
  const [queries, setQueries] = useState<ChatQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('all');
  const [contextFilter, setContextFilter] = useState<string>('all');
  const [editingNotes, setEditingNotes] = useState<{ [key: string]: string }>({});
  const [selectedQuery, setSelectedQuery] = useState<ChatQuery | null>(null);
  const [improveDialogOpen, setImproveDialogOpen] = useState(false);
  const [queryToImprove, setQueryToImprove] = useState<ChatQuery | null>(null);

  const loadQueries = async () => {
    setLoading(true);

    let query = supabase
      .from('chatbot_queries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }
    
    if (contextFilter !== 'all') {
      query = query.eq('chat_context', contextFilter);
    }

    const result = await safeQuery<ChatQuery[]>(query, 'RAG_QUESTIONS_LOAD');

    if (!result.success) {
      logError('rag-questions', 'Error loading questions', result.error);
      errorToast(result.error!);
      setQueries([]);
      setLoading(false);
      return;
    }

    setQueries(result.data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadQueries();
  }, [filter, contextFilter]);

  const updateStatus = async (id: string, status: string) => {
    const result = await safeMutation(
      supabase
        .from('chatbot_queries')
        .update({ status })
        .eq('id', id),
      'RAG_QUESTIONS_UPDATE_STATUS'
    );

    if (!result.success) {
      logError('rag-questions', 'Error updating status', result.error);
      errorToast(result.error!);
      return;
    }

    setQueries(queries.map(q => q.id === id ? { ...q, status } : q));
    successToast('Statut mis à jour');
  };

  const saveNotes = async (id: string, notes: string) => {
    const result = await safeMutation(
      supabase
        .from('chatbot_queries')
        .update({ admin_notes: notes })
        .eq('id', id),
      'RAG_QUESTIONS_UPDATE_NOTES'
    );

    if (!result.success) {
      logError('rag-questions', 'Error saving notes', result.error);
      errorToast(result.error!);
      return;
    }

    setQueries(queries.map(q => q.id === id ? { ...q, admin_notes: notes } : q));
    setEditingNotes(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    successToast('Notes enregistrées');
  };

  const pendingCount = queries.filter(q => q.status === 'pending').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Questions du Chatbot
        </CardTitle>
        <CardDescription>
          Historique des interactions avec Mme MICHU
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex gap-2 mb-4 flex-wrap items-center">
          <Button
            size="sm"
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            Toutes ({queries.length})
          </Button>
          <Button
            size="sm"
            variant={filter === 'pending' ? 'default' : 'outline'}
            onClick={() => setFilter('pending')}
          >
            <AlertCircle className="w-3 h-3 mr-1" />
            En attente ({pendingCount})
          </Button>
          <Button
            size="sm"
            variant={filter === 'resolved' ? 'default' : 'outline'}
            onClick={() => setFilter('resolved')}
          >
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Résolues
          </Button>
          
          <Select value={contextFilter} onValueChange={setContextFilter}>
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue placeholder="Contexte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous contextes</SelectItem>
              <SelectItem value="apogee">Apogée</SelectItem>
              <SelectItem value="apporteurs">Apporteurs</SelectItem>
              <SelectItem value="helpconfort">HelpConfort</SelectItem>
              <SelectItem value="autre">Autre</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="ml-auto">
            <Button variant="outline" size="sm" onClick={loadQueries} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Questions List */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : queries.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Aucune question</p>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {queries.map((query) => (
              <Card key={query.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-medium">{query.question}</p>
                    {query.answer && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {query.answer}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {query.chat_context && (
                      <Badge variant="outline" className="text-xs">
                        {query.chat_context}
                      </Badge>
                    )}
                    <Badge
                      variant={
                        query.status === 'pending'
                          ? 'destructive'
                          : query.status === 'resolved'
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {query.status === 'pending' ? 'En attente' : query.status === 'resolved' ? 'Résolue' : query.status}
                    </Badge>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelectedQuery(query)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Détail de la question</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Question</p>
                            <p className="mt-1">{query.question}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Réponse</p>
                            <p className="mt-1 whitespace-pre-wrap">{query.answer || '-'}</p>
                          </div>
                          {query.context_found && (
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Contexte RAG utilisé</p>
                              <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-x-auto whitespace-pre-wrap">
                                {query.context_found}
                              </pre>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-muted-foreground">
                    {query.created_at && format(new Date(query.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                  </span>
                  {query.improvement_block_id && (
                    <Badge variant="secondary" className="text-xs">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Amélioré
                    </Badge>
                  )}
                  <div className="flex gap-1 ml-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7"
                      onClick={() => {
                        setQueryToImprove(query);
                        setImproveDialogOpen(true);
                      }}
                    >
                      <BookPlus className="w-3 h-3 mr-1" /> Améliorer
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7"
                      onClick={() => updateStatus(query.id, 'resolved')}
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Résoudre
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7"
                      onClick={() => updateStatus(query.id, 'pending')}
                    >
                      <Clock className="w-3 h-3 mr-1" /> En attente
                    </Button>
                  </div>
                </div>

                {/* Admin Notes */}
                <div className="mt-2">
                  <Textarea
                    placeholder="Notes admin..."
                    value={editingNotes[query.id] ?? query.admin_notes ?? ''}
                    onChange={(e) => setEditingNotes({ ...editingNotes, [query.id]: e.target.value })}
                    rows={2}
                    className="text-sm"
                  />
                  {editingNotes[query.id] !== undefined && editingNotes[query.id] !== query.admin_notes && (
                    <Button
                      size="sm"
                      className="mt-1 h-7"
                      onClick={() => saveNotes(query.id, editingNotes[query.id])}
                    >
                      Sauvegarder notes
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>

      {/* Improve Guide Dialog */}
      <ImproveGuideDialog
        open={improveDialogOpen}
        onOpenChange={setImproveDialogOpen}
        query={queryToImprove}
        onSuccess={loadQueries}
      />
    </Card>
  );
}
