import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/RichTextEditor';
import { TipsType } from '@/types/block';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, AlertTriangle, Lightbulb, Info, XCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const tipsConfig: Record<TipsType, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; defaultTitle: string }> = {
  danger: { label: 'À ne surtout pas faire', icon: XCircle, color: 'red', defaultTitle: '🚫 À ne surtout pas faire' },
  warning: { label: 'Attention', icon: AlertTriangle, color: 'orange', defaultTitle: '⚠️ Attention' },
  success: { label: 'Astuce / Conseil', icon: Lightbulb, color: 'green', defaultTitle: '💡 Astuce / Conseil' },
  information: { label: 'Information', icon: Info, color: 'blue', defaultTitle: 'ℹ️ Information' },
};

interface TipsEditFormProps {
  sectionId: string;
  initialTitle: string;
  initialContent: string;
  initialTipsType: TipsType;
  initialHideFromSidebar: boolean;
  onSave: (title: string, content: string, tipsType: TipsType, hideFromSidebar: boolean) => Promise<void>;
  onCancel: () => void;
}

export const TipsEditForm = ({
  sectionId,
  initialTitle,
  initialContent,
  initialTipsType,
  initialHideFromSidebar,
  onSave,
  onCancel,
}: TipsEditFormProps) => {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [tipsType, setTipsType] = useState<TipsType>(initialTipsType);
  const [hideFromSidebar, setHideFromSidebar] = useState(initialHideFromSidebar);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [titleManuallyEdited, setTitleManuallyEdited] = useState(false);

  const storageKey = `tips-draft-${sectionId}`;

  // Auto-save draft to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(`${storageKey}-title`, title);
  }, [title, storageKey]);

  useEffect(() => {
    sessionStorage.setItem(`${storageKey}-content`, content);
  }, [content, storageKey]);

  useEffect(() => {
    sessionStorage.setItem(`${storageKey}-type`, tipsType);
  }, [tipsType, storageKey]);

  useEffect(() => {
    sessionStorage.setItem(`${storageKey}-hide`, hideFromSidebar.toString());
  }, [hideFromSidebar, storageKey]);

  // Mettre à jour le titre par défaut quand le type change SEULEMENT si l'utilisateur n'a pas modifié le titre
  useEffect(() => {
    if (!titleManuallyEdited) {
      const defaultTitle = tipsConfig[tipsType].defaultTitle;
      setTitle(defaultTitle);
    }
  }, [tipsType, titleManuallyEdited]);

  // Handler pour le changement de titre
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setTitleManuallyEdited(true);
  };

  const clearStorage = () => {
    sessionStorage.removeItem(`${storageKey}-title`);
    sessionStorage.removeItem(`${storageKey}-content`);
    sessionStorage.removeItem(`${storageKey}-type`);
    sessionStorage.removeItem(`${storageKey}-hide`);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(title, content, tipsType, hideFromSidebar);
      clearStorage();
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setCancelDialogOpen(true);
  };

  const confirmCancel = (keepDraft: boolean) => {
    if (!keepDraft) {
      clearStorage();
    }
    onCancel();
    setCancelDialogOpen(false);
  };

  return (
    <div className="space-y-4 bg-background p-6 rounded-lg border">
      <h3 className="text-lg font-semibold">Éditer le TIPS</h3>
      
      {/* Type de TIPS */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Type de TIPS</label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(tipsConfig) as [TipsType, typeof tipsConfig[TipsType]][]).map(([type, config]) => {
            const Icon = config.icon;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setTipsType(type)}
                className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                  tipsType === type
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{config.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Titre */}
      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium">
          Titre
        </label>
        <Input
          id="title"
          value={title}
          onChange={handleTitleChange}
          placeholder={tipsConfig[tipsType].defaultTitle}
        />
        <p className="text-xs text-muted-foreground">
          Titre par défaut : {tipsConfig[tipsType].defaultTitle}
        </p>
      </div>

      {/* Masquer du sommaire */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="hideFromSidebar"
          checked={hideFromSidebar}
          onCheckedChange={(checked) => setHideFromSidebar(checked as boolean)}
        />
        <label htmlFor="hideFromSidebar" className="text-sm cursor-pointer">
          Masquer du sommaire
        </label>
      </div>

      {/* Éditeur de contenu */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Contenu</label>
        <RichTextEditor
          content={content}
          onChange={setContent}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={handleCancel}>
          Annuler
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>

      {/* Dialog de confirmation d'annulation */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler les modifications ?</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous conserver le brouillon de vos modifications ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => confirmCancel(false)}>
              Annuler et supprimer le brouillon
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmCancel(true)}>
              Annuler et garder le brouillon
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
