/**
 * FAQ Edit Dialog - Create/Edit FAQ item
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Loader2 } from 'lucide-react';
import { FaqItem, FaqCategory, CONTEXT_OPTIONS, ROLE_OPTIONS, ContextType } from './types';
import { toast } from 'sonner';

interface FaqEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: FaqItem | null;
  categories: FaqCategory[];
  defaultContext?: ContextType;
  onSave: (data: Partial<FaqItem>) => Promise<boolean>;
}

export function FaqEditDialog({
  open,
  onOpenChange,
  item,
  categories,
  defaultContext = 'apogee',
  onSave,
}: FaqEditDialogProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    context_type: defaultContext,
    category_id: '',
    is_published: true,
    role_cible: 'all',
  });

  useEffect(() => {
    if (item) {
      setFormData({
        question: item.question,
        answer: item.answer,
        context_type: item.context_type as ContextType,
        category_id: item.category_id || '',
        is_published: item.is_published,
        role_cible: item.role_cible || 'all',
      });
    } else {
      setFormData({
        question: '',
        answer: '',
        context_type: defaultContext,
        category_id: '',
        is_published: true,
        role_cible: 'all',
      });
    }
  }, [item, defaultContext]);

  const handleSave = async () => {
    if (!formData.question.trim() || !formData.answer.trim()) {
      toast.error('Veuillez remplir la question et la réponse');
      return;
    }

    setSaving(true);
    const data = {
      question: formData.question.trim(),
      answer: formData.answer.trim(),
      context_type: formData.context_type,
      category_id: formData.category_id || null,
      is_published: formData.is_published,
      role_cible: formData.role_cible === 'all' ? null : formData.role_cible,
    };

    const success = await onSave(data);
    setSaving(false);
    
    if (success) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {item ? 'Modifier la FAQ' : 'Nouvelle FAQ'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Question</Label>
            <Input
              value={formData.question}
              onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))}
              placeholder="Quelle est la question ?"
            />
          </div>

          <div>
            <Label>Réponse</Label>
            <Textarea
              value={formData.answer}
              onChange={(e) => setFormData(prev => ({ ...prev, answer: e.target.value }))}
              placeholder="La réponse détaillée..."
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

          <div>
            <Label>Visible par</Label>
            <Select
              value={formData.role_cible}
              onValueChange={(v) => setFormData(prev => ({ ...prev, role_cible: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <Button onClick={handleSave} disabled={saving} className="bg-helpconfort-blue hover:bg-helpconfort-blue/90">
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {item ? 'Enregistrer' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
