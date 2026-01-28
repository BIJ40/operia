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
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OperiaBlock } from '@/contexts/HcServicesEditorContext';
import { RichTextEditor } from '@/components/RichTextEditor';

interface HcServicesEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: OperiaBlock | null | undefined;
  onSave: (updates: Partial<OperiaBlock>) => void;
}

export function HcServicesEditDialog({
  open,
  onOpenChange,
  section,
  onSave,
}: HcServicesEditDialogProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contentType, setContentType] = useState<'section' | 'tips'>('section');
  const [tipsType, setTipsType] = useState('information');
  const [isInProgress, setIsInProgress] = useState(false);
  const [isEmpty, setIsEmpty] = useState(false);

  useEffect(() => {
    if (section) {
      setTitle(section.title);
      setContent(section.content);
      setContentType(section.contentType === 'tips' ? 'tips' : 'section');
      setTipsType(section.tipsType || 'information');
      setIsInProgress(section.isInProgress || false);
      setIsEmpty(section.isEmpty || false);
    }
  }, [section]);

  const handleSave = () => {
    onSave({
      title,
      content,
      contentType,
      tipsType: contentType === 'tips' ? tipsType : undefined,
      isInProgress,
      isEmpty,
      contentUpdatedAt: new Date().toISOString(),
    });
    onOpenChange(false);
  };

  if (!section) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier la section</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titre</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre de la section"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type de contenu</Label>
              <Select value={contentType} onValueChange={(v) => setContentType(v as 'section' | 'tips')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="section">Section</SelectItem>
                  <SelectItem value="tips">TIPS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {contentType === 'tips' && (
              <div className="space-y-2">
                <Label>Type de TIPS</Label>
                <Select value={tipsType} onValueChange={setTipsType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="information">ℹ️ Information</SelectItem>
                    <SelectItem value="warning">⚠️ Attention</SelectItem>
                    <SelectItem value="error">❌ Erreur</SelectItem>
                    <SelectItem value="success">✅ Succès</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Contenu</Label>
            <RichTextEditor
              content={content}
              onChange={setContent}
            />
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Checkbox
                id="in-progress"
                checked={isInProgress}
                onCheckedChange={(checked) => setIsInProgress(checked as boolean)}
              />
              <Label htmlFor="in-progress" className="cursor-pointer">
                En cours de rédaction
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="is-empty"
                checked={isEmpty}
                onCheckedChange={(checked) => setIsEmpty(checked as boolean)}
              />
              <Label htmlFor="is-empty" className="cursor-pointer text-muted-foreground">
                Marquer comme vide
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
