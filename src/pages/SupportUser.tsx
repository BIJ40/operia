/**
 * Support User V2 - Page principale support utilisateur
 * Interface 3 colonnes : FAQ | Chat | Mes demandes
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserTickets, Ticket } from '@/hooks/use-user-tickets';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { safeQuery, safeInvoke } from '@/lib/safeQuery';
import { logError } from '@/lib/logger';
import { 
  MessageSquare, 
  HelpCircle, 
  FileText, 
  Send, 
  Plus, 
  Loader2,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ROUTES } from '@/config/routes';
import { getFilteredContexts, type RAGContextType } from '@/lib/rag-michu';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category_id: string | null;
  role_cible: string | null;
}

export default function SupportUser() {
  const { user, globalRole } = useAuth();
  const navigate = useNavigate();
  const { tickets, isLoading: ticketsLoading, createTicket, isCreating } = useUserTickets();
  
  const [faqItems, setFaqItems] = useState<FAQItem[]>([]);
  const [faqLoading, setFaqLoading] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [selectedFAQ, setSelectedFAQ] = useState<FAQItem | null>(null);

  // Get allowed RAG contexts based on user role
  const allowedContexts = getFilteredContexts(globalRole || 'base_user');

  // Load FAQ items filtered by user role
  useEffect(() => {
    const loadFAQ = async () => {
      setFaqLoading(true);
      
      // Map global_role to role_cible filter
      const roleLevel = getRoleLevel(globalRole);
      
      const result = await safeQuery<FAQItem[]>(
        supabase
          .from('faq_items')
          .select('id, question, answer, category_id, role_cible')
          .eq('is_published', true)
          .order('display_order', { ascending: true })
          .limit(10),
        'SUPPORT_USER_FAQ_LOAD'
      );

      if (result.success && result.data) {
        // Filter FAQ by role level
        const filteredFAQ = result.data.filter(item => {
          if (!item.role_cible) return true;
          const itemRoleLevel = getRoleLevel(item.role_cible);
          return itemRoleLevel <= roleLevel;
        });
        setFaqItems(filteredFAQ);
      }
      setFaqLoading(false);
    };

    loadFAQ();
  }, [globalRole]);

  // Get role level for filtering
  function getRoleLevel(role: string | null): number {
    const levels: Record<string, number> = {
      'base_user': 0,
      'franchisee_user': 1,
      'franchisee_admin': 2,
      'franchisor_user': 3,
      'franchisor_admin': 4,
      'platform_admin': 5,
      'superadmin': 6,
    };
    return levels[role || 'base_user'] || 0;
  }

  // Handle chat message send
  const handleSendChat = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatLoading(true);

    try {
      // Determine context based on allowed contexts
      const defaultContext: RAGContextType = allowedContexts.includes('apogee') ? 'apogee' : allowedContexts[0] || 'apogee';

      const result = await safeInvoke<{ response: string }>(
        supabase.functions.invoke('chat-guide', {
          body: {
            question: userMessage,
            contextType: defaultContext,
            history: chatMessages,
          },
        }),
        'SUPPORT_USER_CHAT'
      );

      if (result.success && result.data?.response) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: result.data!.response }]);
      } else {
        setChatMessages(prev => [...prev, { 
          role: 'assistant', 
          content: "Désolé, je n'ai pas pu traiter votre demande. Vous pouvez créer un ticket pour obtenir de l'aide." 
        }]);
      }
    } catch (error) {
      logError('support-user', 'Chat error', error);
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Une erreur est survenue. Veuillez réessayer ou créer un ticket." 
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; icon: typeof Clock; className: string }> = {
      new: { label: 'Nouveau', icon: Clock, className: 'bg-blue-100 text-blue-800' },
      in_progress: { label: 'En cours', icon: AlertCircle, className: 'bg-yellow-100 text-yellow-800' },
      waiting_user: { label: 'Attente réponse', icon: Clock, className: 'bg-orange-100 text-orange-800' },
      resolved: { label: 'Résolu', icon: CheckCircle2, className: 'bg-green-100 text-green-800' },
      closed: { label: 'Fermé', icon: CheckCircle2, className: 'bg-gray-100 text-gray-800' },
    };
    const { label, icon: Icon, className } = config[status] || config.new;
    return (
      <Badge variant="outline" className={`${className} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    );
  };

  // Recent tickets (max 5)
  const recentTickets = tickets.slice(0, 5);

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
          Centre d'aide
        </h1>
        <p className="text-muted-foreground mt-1">
          Trouvez des réponses ou contactez le support
        </p>
      </div>

      {/* 3 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: FAQ */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <HelpCircle className="w-5 h-5 text-primary" />
              Questions fréquentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              {faqLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : faqItems.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucune FAQ disponible
                </p>
              ) : (
                <div className="space-y-2">
                  {faqItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedFAQ(selectedFAQ?.id === item.id ? null : item)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        selectedFAQ?.id === item.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                    >
                      <p className="font-medium text-sm">{item.question}</p>
                      {selectedFAQ?.id === item.id && (
                        <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                          {item.answer}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Column 2: Chat */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="w-5 h-5 text-primary" />
              Chat IA
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Contextes disponibles: {allowedContexts.join(', ')}
            </p>
          </CardHeader>
          <CardContent className="flex flex-col h-[500px]">
            <ScrollArea className="flex-1 pr-4 mb-4">
              <div className="space-y-4">
                {chatMessages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Posez votre question à l'assistant</p>
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-primary/10 ml-4'
                          : 'bg-muted mr-4'
                      }`}
                    >
                      <p className="text-xs font-medium mb-1">
                        {msg.role === 'user' ? 'Vous' : 'Assistant'}
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  ))
                )}
                {isChatLoading && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Réponse en cours...</span>
                  </div>
                )}
              </div>
            </ScrollArea>
            
            <div className="flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder="Posez votre question..."
                disabled={isChatLoading}
              />
              <Button 
                onClick={handleSendChat} 
                disabled={!chatInput.trim() || isChatLoading}
                size="icon"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>

            <Separator className="my-4" />

            {/* Quick actions */}
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => navigate(ROUTES.support.userTickets)}
              >
                <Plus className="w-4 h-4" />
                Créer un ticket
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Column 3: My Demands */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5 text-primary" />
                Mes demandes
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(ROUTES.support.userTickets)}
                className="text-xs"
              >
                Voir tout
                <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              {ticketsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : recentTickets.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Aucune demande en cours</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => navigate(ROUTES.support.userTickets)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Créer un ticket
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentTickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      onClick={() => navigate(ROUTES.support.userTickets)}
                      className="w-full text-left p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="font-medium text-sm truncate flex-1">
                          {ticket.subject}
                        </p>
                        {getStatusBadge(ticket.status)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(ticket.created_at), 'dd MMM yyyy', { locale: fr })}
                      </p>
                      {ticket.unreadCount && ticket.unreadCount > 0 && (
                        <Badge className="mt-2 bg-red-500 text-white">
                          {ticket.unreadCount} nouveau{ticket.unreadCount > 1 ? 'x' : ''}
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
