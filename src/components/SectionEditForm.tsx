import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RichTextEditor } from '@/components/RichTextEditor';
import { ColorPreset } from '@/types/block';
import { useState, useEffect } from 'react';
import { Save, X, Clock, Sparkles, Check, RefreshCw, Ban } from 'lucide-react';
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

// Mapping couleur -> titre par défaut
const getDefaultTitleByColor = (color: ColorPreset): string => {
  const mapping: Record<ColorPreset, string> = {
    red: '❌ Important',
    yellow: '⚠️ Attention',
    orange: '⚠️ Attention',
    green: '✅ Conseil',
    blue: 'ℹ️ Information',
    cyan: 'ℹ️ Information',
    indigo: 'ℹ️ Information',
    gray: '💡 Note',
    purple: '🔮 Astuce',
    pink: '💗 À retenir',
    rose: '💗 À retenir',
    teal: '📌 Point clé',
    blanc: '',
    white: '',
  };
  return mapping[color] || '';
};

interface SectionEditFormProps {
  sectionId: string;
  initialTitle: string;
  initialContent: string;
  initialColor: ColorPreset;
  initialSummary?: string;
  initialShowSummary?: boolean;
  initialHideTitle?: boolean;
  initialHideFromSidebar?: boolean;
  initialIsInProgress?: boolean;
  initialCompletedAt?: string;
  initialContentUpdatedAt?: string;
  initialIsEmpty?: boolean;
  onSave: (data: {
    title: string;
    content: string;
    colorPreset: ColorPreset;
    summary?: string;
    showSummary?: boolean;
    hideTitle?: boolean;
    hideFromSidebar?: boolean;
    isInProgress?: boolean;
    completedAt?: string;
    contentUpdatedAt?: string;
    isEmpty?: boolean;
  }) => void;
  onCancel: () => void;
}

export function SectionEditForm({
  sectionId,
  initialTitle,
  initialContent,
  initialColor,
  initialSummary = '',
  initialShowSummary = true,
  initialHideTitle = false,
  initialHideFromSidebar = false,
  initialIsInProgress = false,
  initialCompletedAt,
  initialContentUpdatedAt,
  initialIsEmpty = false,
  onSave,
  onCancel,
}: SectionEditFormProps) {
  // Clé stable basée sur l'ID de la section
  const storageKey = `edit-draft-${sectionId}`;
  
  // Charger l'état sauvegardé ou utiliser les valeurs initiales
  const [title, setTitle] = useState(() => {
    const saved = sessionStorage.getItem(`${storageKey}-title`);
    return saved || initialTitle;
  });
  const [content, setContent] = useState(() => {
    const saved = sessionStorage.getItem(`${storageKey}-content`);
    return saved || initialContent;
  });
  const [color, setColor] = useState<ColorPreset>(() => {
    const saved = sessionStorage.getItem(`${storageKey}-color`);
    return (saved as ColorPreset) || initialColor;
  });
  const [summary, setSummary] = useState(() => {
    const saved = sessionStorage.getItem(`${storageKey}-summary`);
    return saved || initialSummary;
  });
  const [showSummary, setShowSummary] = useState(() => {
    const saved = sessionStorage.getItem(`${storageKey}-showSummary`);
    return saved ? saved === 'true' : initialShowSummary;
  });
  const [hideTitle, setHideTitle] = useState(() => {
    const saved = sessionStorage.getItem(`${storageKey}-hideTitle`);
    return saved ? saved === 'true' : initialHideTitle;
  });
  const [hideFromSidebar, setHideFromSidebar] = useState(() => {
    const saved = sessionStorage.getItem(`${storageKey}-hideFromSidebar`);
    return saved ? saved === 'true' : initialHideFromSidebar;
  });
  const [isInProgress, setIsInProgress] = useState(initialIsInProgress);
  const [completedAt, setCompletedAt] = useState(initialCompletedAt);
  const [contentUpdatedAt, setContentUpdatedAt] = useState(initialContentUpdatedAt);
  const [isEmpty, setIsEmpty] = useState(initialIsEmpty);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Helper to check if section is new (completed within 7 days)
  const isNew = completedAt && (new Date().getTime() - new Date(completedAt).getTime()) < 7 * 24 * 60 * 60 * 1000;
  // Helper to check if section was recently updated (within 7 days)
  const isUpdated = contentUpdatedAt && (new Date().getTime() - new Date(contentUpdatedAt).getTime()) < 7 * 24 * 60 * 60 * 1000;

  // Sauvegarder automatiquement l'état lors des modifications
  useEffect(() => {
    try {
      sessionStorage.setItem(`${storageKey}-title`, title);
    } catch (e) {
      // Silently fail if quota exceeded
      console.warn('Unable to save draft to sessionStorage:', e);
    }
  }, [title, storageKey]);

  useEffect(() => {
    try {
      sessionStorage.setItem(`${storageKey}-content`, content);
    } catch (e) {
      // Silently fail if quota exceeded
      console.warn('Unable to save draft to sessionStorage:', e);
    }
  }, [content, storageKey]);

  useEffect(() => {
    try {
      sessionStorage.setItem(`${storageKey}-color`, color);
    } catch (e) {
      // Silently fail if quota exceeded
      console.warn('Unable to save draft to sessionStorage:', e);
    }
  }, [color, storageKey]);

  useEffect(() => {
    try {
      sessionStorage.setItem(`${storageKey}-summary`, summary);
    } catch (e) {
      // Silently fail if quota exceeded
      console.warn('Unable to save draft to sessionStorage:', e);
    }
  }, [summary, storageKey]);

  useEffect(() => {
    try {
      sessionStorage.setItem(`${storageKey}-showSummary`, showSummary.toString());
    } catch (e) {
      // Silently fail if quota exceeded
      console.warn('Unable to save draft to sessionStorage:', e);
    }
  }, [showSummary, storageKey]);

  useEffect(() => {
    try {
      sessionStorage.setItem(`${storageKey}-hideTitle`, hideTitle.toString());
    } catch (e) {
      // Silently fail if quota exceeded
      console.warn('Unable to save draft to sessionStorage:', e);
    }
  }, [hideTitle, storageKey]);

  useEffect(() => {
    try {
      sessionStorage.setItem(`${storageKey}-hideFromSidebar`, hideFromSidebar.toString());
    } catch (e) {
      // Silently fail if quota exceeded
      console.warn('Unable to save draft to sessionStorage:', e);
    }
  }, [hideFromSidebar, storageKey]);

  // Proposer un titre par défaut quand la couleur change
  useEffect(() => {
    const defaultTitle = getDefaultTitleByColor(color);
    // Proposer le titre par défaut uniquement si :
    // - le titre est vide OU
    // - le titre actuel correspond à un titre par défaut d'une autre couleur
    const isDefaultTitle = Object.values({
      red: '❌ Important',
      yellow: '⚠️ Attention',
      orange: '⚠️ Attention',
      green: '✅ Conseil',
      blue: 'ℹ️ Information',
      cyan: 'ℹ️ Information',
      indigo: 'ℹ️ Information',
      gray: '💡 Note',
      purple: '🔮 Astuce',
      pink: '💗 À retenir',
      rose: '💗 À retenir',
      teal: '📌 Point clé',
    } as const).includes(title as any);
    
    if (defaultTitle && (title === '' || isDefaultTitle)) {
      setTitle(defaultTitle);
    }
  }, [color]);

  // Nettoyer le stockage lors de la sauvegarde ou de l'annulation
  const clearStorage = () => {
    sessionStorage.removeItem(`${storageKey}-title`);
    sessionStorage.removeItem(`${storageKey}-content`);
    sessionStorage.removeItem(`${storageKey}-color`);
    sessionStorage.removeItem(`${storageKey}-summary`);
    sessionStorage.removeItem(`${storageKey}-showSummary`);
    sessionStorage.removeItem(`${storageKey}-hideTitle`);
    sessionStorage.removeItem(`${storageKey}-hideFromSidebar`);
  };

  const handleSave = () => {
    // Automatically set contentUpdatedAt if content changed
    const hasContentChanged = content !== initialContent;
    const newContentUpdatedAt = hasContentChanged ? new Date().toISOString() : contentUpdatedAt;
    
    onSave({ 
      title, 
      content, 
      colorPreset: color, 
      summary, 
      showSummary, 
      hideTitle, 
      hideFromSidebar,
      isInProgress,
      completedAt,
      contentUpdatedAt: newContentUpdatedAt,
      isEmpty,
    });
    clearStorage();
  };

  const handleMarkComplete = () => {
    setIsInProgress(false);
    setCompletedAt(new Date().toISOString());
    setIsEmpty(false);
  };

  const handleMarkInProgress = () => {
    setIsInProgress(true);
    setCompletedAt(undefined);
    setIsEmpty(false);
  };

  const handleMarkUpdated = () => {
    setContentUpdatedAt(new Date().toISOString());
  };

  const handleClearUpdated = () => {
    setContentUpdatedAt(undefined);
  };

  const handleMarkEmpty = () => {
    setIsEmpty(true);
    setIsInProgress(false);
    setCompletedAt(undefined);
    setContentUpdatedAt(undefined);
  };

  const handleClearEmpty = () => {
    setIsEmpty(false);
  };

  const handleCancel = () => {
    // Vérifier si des modifications ont été faites
    const hasChanges = title !== initialTitle || 
                       content !== initialContent || 
                       color !== initialColor;
    
    if (hasChanges) {
      setShowCancelDialog(true);
    } else {
      clearStorage();
      onCancel();
    }
  };

  const confirmCancel = (keepDraft: boolean) => {
    if (!keepDraft) {
      clearStorage();
    }
    setShowCancelDialog(false);
    onCancel();
  };

  return (
    <div className="space-y-4">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titre"
        className="font-semibold text-xl"
      />
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Couleur</label>
          <div className="flex gap-2">
            <Button 
              type="button"
              size="icon"
              onClick={handleSave}
              title="Enregistrer"
            >
              <Save className="h-4 w-4" />
            </Button>
            <Button 
              type="button"
              size="icon"
              variant="outline"
              onClick={handleCancel}
              title="Annuler"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'red', color: 'bg-red-50 border-2 border-red-200', label: 'Rouge' },
            { value: 'blanc', color: 'bg-white border-2 border-gray-300', label: 'Blanc' },
            { value: 'gray', color: 'bg-gray-50 border-2 border-gray-200', label: 'Gris' },
            { value: 'green', color: 'bg-green-50 border-2 border-green-200', label: 'Vert' },
            { value: 'yellow', color: 'bg-yellow-50 border-2 border-yellow-200', label: 'Jaune' },
            { value: 'blue', color: 'bg-blue-50 border-2 border-blue-200', label: 'Bleu' },
            { value: 'purple', color: 'bg-purple-50 border-2 border-purple-200', label: 'Violet' },
            { value: 'pink', color: 'bg-pink-50 border-2 border-pink-200', label: 'Rose' },
            { value: 'orange', color: 'bg-orange-50 border-2 border-orange-200', label: 'Orange' },
            { value: 'cyan', color: 'bg-cyan-50 border-2 border-cyan-200', label: 'Cyan' },
            { value: 'indigo', color: 'bg-indigo-50 border-2 border-indigo-200', label: 'Indigo' },
            { value: 'teal', color: 'bg-teal-50 border-2 border-teal-200', label: 'Sarcelle' },
            { value: 'rose', color: 'bg-rose-50 border-2 border-rose-200', label: 'Rose foncé' },
          ].map((colorOption) => (
            <button
              key={colorOption.value}
              type="button"
              onClick={() => setColor(colorOption.value as ColorPreset)}
              className={`w-8 h-8 rounded-full ${colorOption.color} transition-all hover:scale-110 ${
                color === colorOption.value 
                  ? 'ring-4 ring-primary ring-offset-2' 
                  : ''
              }`}
              title={colorOption.label}
            />
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center space-x-2 py-2">
          <Checkbox 
            id="hideTitle" 
            checked={hideTitle}
            onCheckedChange={(checked) => setHideTitle(checked as boolean)}
          />
          <label 
            htmlFor="hideTitle" 
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            Ne pas afficher le titre (afficher juste un encart avec bordure)
          </label>
        </div>
        <div className="flex items-center space-x-2 py-2">
          <Checkbox 
            id="hideFromSidebar" 
            checked={hideFromSidebar}
            onCheckedChange={(checked) => setHideFromSidebar(checked as boolean)}
          />
          <label 
            htmlFor="hideFromSidebar" 
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            Ne pas afficher dans le sommaire
          </label>
        </div>
      </div>
      
      {/* Section status controls */}
      <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
        <label className="text-sm font-medium">Statut de la section</label>
        <div className="flex gap-2 flex-wrap">
          <Button 
            type="button"
            size="sm"
            variant={isEmpty ? "default" : "outline"}
            onClick={isEmpty ? handleClearEmpty : handleMarkEmpty}
            className="gap-1 bg-muted/50 border-muted-foreground/40 hover:bg-muted text-muted-foreground"
          >
            <Ban className="w-3 h-3" />
            {isEmpty ? "Retirer Vide" : "Vide"}
          </Button>
          <Button 
            type="button"
            size="sm"
            variant={isInProgress && !isEmpty ? "default" : "outline"}
            onClick={handleMarkInProgress}
            className="gap-1"
            disabled={isEmpty}
          >
            <Clock className="w-3 h-3" />
            En cours
          </Button>
          <Button 
            type="button"
            size="sm"
            variant={!isInProgress && completedAt && !isEmpty ? "default" : "outline"}
            onClick={handleMarkComplete}
            className="gap-1"
            disabled={isEmpty}
          >
            <Check className="w-3 h-3" />
            Terminé
          </Button>
          <Button 
            type="button"
            size="sm"
            variant={isUpdated && !isEmpty ? "default" : "outline"}
            onClick={isUpdated ? handleClearUpdated : handleMarkUpdated}
            className="gap-1 bg-primary/10 border-primary/40 hover:bg-primary/20 text-primary"
            disabled={isEmpty}
          >
            <RefreshCw className="w-3 h-3" />
            {isUpdated ? "Retirer M.A.J" : "Marquer M.A.J"}
          </Button>
        </div>
        {isEmpty && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Ban className="w-3 h-3" />
            Section grisée - indique qu'elle n'est pas encore rédigée
          </div>
        )}
        {isNew && !isEmpty && (
          <div className="flex items-center gap-1 text-xs text-accent">
            <Sparkles className="w-3 h-3" />
            Badge "New" affiché pendant 7 jours
          </div>
        )}
        {isUpdated && !isEmpty && (
          <div className="flex items-center gap-1 text-xs text-primary">
            <RefreshCw className="w-3 h-3" />
            Badge "M.A.J" affiché pendant 7 jours
          </div>
        )}
      </div>
      {!hideTitle && (
        <div className="flex items-center space-x-2 py-2">
          <Checkbox 
            id="showSummary" 
            checked={showSummary}
            onCheckedChange={(checked) => setShowSummary(checked as boolean)}
          />
          <label 
            htmlFor="showSummary" 
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            Afficher l'icône résumé
          </label>
        </div>
      )}
      {showSummary && (
        <div className="space-y-2">
          <label htmlFor="summary" className="text-sm font-medium">
            Résumé (affiché au survol de l'icône info)
          </label>
          <textarea
            id="summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Entrez un bref résumé de cette section..."
            className="w-full min-h-[100px] p-3 border rounded-md resize-y"
            rows={3}
          />
        </div>
      )}
      <RichTextEditor
        content={content}
        onChange={setContent}
      />
      <div className="flex gap-2">
        <Button onClick={handleSave}>Enregistrer</Button>
        <Button variant="outline" onClick={handleCancel}>
          Annuler
        </Button>
      </div>
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler les modifications ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous avez des modifications non sauvegardées. Voulez-vous :
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowCancelDialog(false)}>
              Continuer l'édition
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmCancel(true)} className="bg-blue-600 hover:bg-blue-700">
              Garder le brouillon
            </AlertDialogAction>
            <AlertDialogAction onClick={() => confirmCancel(false)} className="bg-destructive hover:bg-destructive/90">
              Tout annuler
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
