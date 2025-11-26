import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Ticket } from 'lucide-react';

interface TimeoutModalProps {
  open: boolean;
  onWait: () => void;
  onCreateTicket: (category: string, subject: string, description: string) => void;
}

export function TimeoutModal({ open, onWait, onCreateTicket }: TimeoutModalProps) {
  const [category, setCategory] = useState('question');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  const handleCreateTicket = () => {
    if (subject.trim() && description.trim()) {
      onCreateTicket(category, subject.trim(), description.trim());
      // Reset form
      setCategory('question');
      setSubject('');
      setDescription('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            Aucune réponse du support
          </DialogTitle>
          <DialogDescription>
            Le support ne semble pas disponible actuellement. Vous pouvez patienter ou créer un ticket pour être recontacté.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="category">Catégorie</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bug">Bug</SelectItem>
                <SelectItem value="improvement">Amélioration</SelectItem>
                <SelectItem value="blocking">Blocage</SelectItem>
                <SelectItem value="question">Question</SelectItem>
                <SelectItem value="other">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Sujet</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Résumé de votre demande"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez votre problème en détail..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={onWait} className="gap-2">
            <Clock className="w-4 h-4" />
            Patienter
          </Button>
          <Button 
            onClick={handleCreateTicket} 
            disabled={!subject.trim() || !description.trim()}
            className="gap-2"
          >
            <Ticket className="w-4 h-4" />
            Créer un ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
