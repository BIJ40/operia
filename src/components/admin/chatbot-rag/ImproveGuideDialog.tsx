/**
 * Dialog for improving guide from a chatbot query
 * P2#3 - Creates RAG block and/or FAQ entry
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, BookPlus, HelpCircle } from 'lucide-react';
import { improveFromQuery, getFaqCategories, type FaqCategory } from '@/lib/rag-improvement';
import type { RAGContextType } from '@/lib/rag-michu';
import { successToast, errorToast } from '@/lib/toastHelpers';
import { logDebug } from '@/lib/logger';

interface ChatQuery {
  id: string;
  question: string;
  answer: string | null;
  chat_context: string | null;
  answer_raw?: string | null;
  context_type_used?: string | null;
  apporteur_code_used?: string | null;
  univers_code_used?: string | null;
  role_cible_used?: string | null;
}

interface ImproveGuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: ChatQuery | null;
  onSuccess?: () => void;
}

export function ImproveGuideDialog({
  open,
  onOpenChange,
  query,
  onSuccess,
}: ImproveGuideDialogProps) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<FaqCategory[]>([]);

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contextType, setContextType] = useState<RAGContextType>('apogee');
  const [categoryId, setCategoryId] = useState<string>('');
  const [apporteurCode, setApporteurCode] = useState('');
  const [universCode, setUniversCode] = useState('');
  const [roleCible, setRoleCible] = useState('');
  const [createBlock, setCreateBlock] = useState(true);
  const [createFaq, setCreateFaq] = useState(true);

  // Load categories on mount
  useEffect(() => {
    getFaqCategories().then(setCategories);
  }, []);

  // Pre-fill form when query changes
  useEffect(() => {
    if (query) {
      // Clean up question for title
      const cleanTitle = query.question
        .replace(/[?!.]+$/, '')
        .slice(0, 100)
        .trim();
      setTitle(cleanTitle);

      // Use answer_raw if available, otherwise answer
      setContent(query.answer_raw || query.answer || '');

      // Set context from query
      const ctx = (query.context_type_used || query.chat_context || 'apogee') as RAGContextType;
      setContextType(ctx);

      // Pre-fill optional fields
      setApporteurCode(query.apporteur_code_used || '');
      setUniversCode(query.univers_code_used || '');
      setRoleCible(query.role_cible_used || '');
    }
  }, [query]);

  const handleSubmit = async () => {
    if (!query || !title.trim() || !content.trim()) {
      errorToast('Titre et contenu requis');
      return;
    }

    if (!createBlock && !createFaq) {
      errorToast('Sélectionnez au moins une option');
      return;
    }

    setLoading(true);
    logDebug('[IMPROVE] Submitting improvement', { queryId: query.id, createBlock, createFaq });

    const result = await improveFromQuery({
      queryId: query.id,
      title: title.trim(),
      content: content.trim(),
      question: query.question,
      answer: content.trim(),
      contextType,
      categoryId: categoryId || undefined,
      apporteurCode: apporteurCode || undefined,
      universCode: universCode || undefined,
      roleCible: roleCible || undefined,
      createBlock,
      createFaq,
    });

    setLoading(false);

    if (result.success) {
      const parts = [];
      if (result.blockId) parts.push('bloc RAG créé');
      if (result.faqId) parts.push('FAQ créée');
      successToast(`Amélioration réussie: ${parts.join(', ')}`);
      onOpenChange(false);
      onSuccess?.();
    } else {
      errorToast(result.error || 'Erreur lors de la création');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookPlus className="h-5 w-5" />
            Améliorer le guide
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Options checkboxes */}
          <div className="flex items-center gap-6 p-3 bg-muted rounded-lg">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="createBlock"
                checked={createBlock}
                onCheckedChange={(checked) => setCreateBlock(!!checked)}
              />
              <Label htmlFor="createBlock" className="flex items-center gap-1 cursor-pointer">
                <BookPlus className="h-4 w-4" />
                Créer bloc Guide (RAG)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="createFaq"
                checked={createFaq}
                onCheckedChange={(checked) => setCreateFaq(!!checked)}
              />
              <Label htmlFor="createFaq" className="flex items-center gap-1 cursor-pointer">
                <HelpCircle className="h-4 w-4" />
                Créer entrée FAQ
              </Label>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Titre du bloc</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre descriptif..."
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Contenu / Réponse</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Contenu du bloc ou réponse FAQ..."
              rows={8}
            />
          </div>

          {/* Context Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Contexte</Label>
              <Select value={contextType} onValueChange={(v) => setContextType(v as RAGContextType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apogee">Apogée</SelectItem>
                  <SelectItem value="apporteurs">Apporteurs</SelectItem>
                  <SelectItem value="helpconfort">HelpConfort</SelectItem>
                  <SelectItem value="documents">Documents</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* FAQ Category */}
            {createFaq && (
              <div className="space-y-2">
                <Label>Catégorie FAQ</Label>
                <Select value={categoryId || '_none'} onValueChange={(v) => setCategoryId(v === '_none' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Aucune</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Optional filters */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="apporteur">Code Apporteur</Label>
              <Input
                id="apporteur"
                value={apporteurCode}
                onChange={(e) => setApporteurCode(e.target.value)}
                placeholder="Optionnel"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="univers">Code Univers</Label>
              <Input
                id="univers"
                value={universCode}
                onChange={(e) => setUniversCode(e.target.value)}
                placeholder="Optionnel"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Rôle cible</Label>
              <Input
                id="role"
                value={roleCible}
                onChange={(e) => setRoleCible(e.target.value)}
                placeholder="Optionnel"
              />
            </div>
          </div>

          {/* Original question preview */}
          {query && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Question originale:</p>
              <p className="text-sm">{query.question}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading || (!createBlock && !createFaq)}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Créer & indexer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
