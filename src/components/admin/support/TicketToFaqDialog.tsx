/**
 * Dialog pour reformuler un ticket résolu avec l'IA et l'ajouter à la FAQ
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Sparkles, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { CONTEXT_OPTIONS, ContextType } from '@/components/admin/faq/types';

interface TicketToFaqDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketSubject: string;
  ticketMessages: Array<{ role: string; content: string }>;
  onSuccess?: () => void;
}

interface FaqCategory {
  id: string;
  label: string;
}

export function TicketToFaqDialog({
  open,
  onOpenChange,
  ticketSubject,
  ticketMessages,
  onSuccess,
}: TicketToFaqDialogProps) {
  const [reformulating, setReformulating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<FaqCategory[]>([]);
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    context_type: 'support' as ContextType,
    category_id: '',
    is_published: true,
  });

  // Charger les catégories FAQ
  useEffect(() => {
    if (open) {
      loadCategories();
      // Préremplir avec le sujet du ticket
      setFormData(prev => ({
        ...prev,
        question: ticketSubject || '',
        answer: '',
      }));
    }
  }, [open, ticketSubject]);

  const loadCategories = async () => {
    const { data } = await supabase
      .from('faq_categories')
      .select('id, label')
      .order('display_order');
    if (data) setCategories(data);
  };

  // Reformuler avec l'IA
  const handleReformulate = async () => {
    setReformulating(true);
    try {
      const { data, error } = await supabase.functions.invoke('reformulate-ticket-faq', {
        body: {
          subject: ticketSubject,
          messages: ticketMessages,
        },
      });

      if (error) throw error;

      if (data?.question && data?.answer) {
        setFormData(prev => ({
          ...prev,
          question: data.question,
          answer: data.answer,
        }));
        toast.success('Question et réponse reformulées');
      }
    } catch (err) {
      console.error('Reformulation error:', err);
      toast.error('Erreur lors de la reformulation');
    } finally {
      setReformulating(false);
    }
  };

  // Sauvegarder dans la FAQ
  const handleSave = async () => {
    if (!formData.question.trim() || !formData.answer.trim()) {
      toast.error('Veuillez remplir la question et la réponse');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('faq_items').insert({
        question: formData.question.trim(),
        answer: formData.answer.trim(),
        context_type: formData.context_type,
        category_id: formData.category_id || null,
        is_published: formData.is_published,
      });

      if (error) throw error;

      toast.success('FAQ ajoutée avec succès');
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      console.error('Save FAQ error:', err);
      toast.error('Erreur lors de la création de la FAQ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Ajouter à la FAQ
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Bouton Reformuler */}
          <Button
            onClick={handleReformulate}
            disabled={reformulating}
            variant="outline"
            className="w-full border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-300 dark:hover:bg-violet-950/30"
          >
            {reformulating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Reformuler avec l'IA
          </Button>

          <div>
            <Label>Question</Label>
            <Textarea
              value={formData.question}
              onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))}
              placeholder="La question reformulée..."
              rows={3}
            />
          </div>

          <div>
            <Label>Réponse</Label>
            <Textarea
              value={formData.answer}
              onChange={(e) => setFormData(prev => ({ ...prev, answer: e.target.value }))}
              placeholder="La réponse reformulée..."
              rows={6}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Contexte</Label>
              <Select
                value={formData.context_type}
                onValueChange={(v) => setFormData(prev => ({ ...prev, context_type: v as ContextType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTEXT_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.icon} {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Catégorie</Label>
              <Select
                value={formData.category_id || 'none'}
                onValueChange={(v) => setFormData(prev => ({ ...prev, category_id: v === 'none' ? '' : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune catégorie</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="is_published"
              checked={formData.is_published}
              onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_published: v }))}
            />
            <Label htmlFor="is_published">Publier immédiatement</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || !formData.question.trim() || !formData.answer.trim()}
            className="bg-helpconfort-blue hover:bg-helpconfort-blue/90"
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Ajouter à la FAQ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
