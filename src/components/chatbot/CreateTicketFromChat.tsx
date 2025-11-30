import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Ticket, AlertCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface CreateTicketFromChatProps {
  messages: Array<{ role: string; content: string }>;
  onCreateTicket: (category: string, subject: string, description: string) => Promise<void>;
  isCreating: boolean;
}

export function CreateTicketFromChat({ messages, onCreateTicket, isCreating }: CreateTicketFromChatProps) {
  const [category, setCategory] = useState('question');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  // Auto-generate subject and description from chat history
  const generateDefaults = () => {
    // Skip trivial greetings for subject (bonjour, salut, hello, hi, etc.)
    const trivialGreetings = ['bonjour', 'salut', 'hello', 'hi', 'coucou', 'bonsoir', 'hey'];
    const userMessages = messages.filter(m => m.role === 'user');
    
    // Find first meaningful user message (not just a greeting)
    const meaningfulMessage = userMessages.find(m => {
      const normalized = m.content.toLowerCase().trim();
      return !trivialGreetings.includes(normalized) && normalized.length > 10;
    }) || userMessages[1] || userMessages[0];
    
    const defaultSubject = meaningfulMessage?.content?.substring(0, 100) || 'Support demandé';
    const defaultDescription = messages
      .map(m => `${m.role === 'user' ? 'Vous' : 'Mme MICHU'}: ${m.content}`)
      .join('\n\n');
    
    return { defaultSubject, defaultDescription };
  };

  const { defaultSubject, defaultDescription } = generateDefaults();

  const handleCreate = async () => {
    const finalSubject = subject || defaultSubject || 'Support demandé depuis le chat';
    const finalDescription = description || defaultDescription;
    await onCreateTicket(category, finalSubject, finalDescription);
  };

  return (
    <Card className="p-6 space-y-4 bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
      <div className="flex items-start gap-3">
        <div className="bg-orange-100 p-2 rounded-lg">
          <AlertCircle className="w-6 h-6 text-orange-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-orange-900">Aucun support disponible</h3>
          <p className="text-sm text-orange-700 mt-1">
            Il semblerait qu'aucun conseiller ne soit disponible en ce moment. Vous pouvez créer un ticket pour être recontacté.
          </p>
        </div>
      </div>

      <div className="space-y-3 bg-white p-4 rounded-lg border border-orange-200">
        <div>
          <label className="text-sm font-medium mb-2 block">Catégorie</label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bug">🐛 Bug</SelectItem>
              <SelectItem value="improvement">💡 Amélioration</SelectItem>
              <SelectItem value="blocking">🚫 Blocage</SelectItem>
              <SelectItem value="question">❓ Question</SelectItem>
              <SelectItem value="other">📝 Autre</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Sujet (optionnel)</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={defaultSubject}
            className="w-full px-3 py-2 border rounded-md text-sm"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Si vide, votre première question sera utilisée
          </p>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Description (optionnel)</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Toute la conversation sera incluse automatiquement"
            className="min-h-[80px]"
          />
        </div>

        <Button
          onClick={handleCreate}
          disabled={isCreating}
          className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Création en cours...
            </>
          ) : (
            <>
              <Ticket className="w-4 h-4 mr-2" />
              Créer un ticket
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
