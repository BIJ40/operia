import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RichTextEditor } from '@/components/RichTextEditor';
import { ColorPreset } from '@/types/block';
import { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
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
  initialHideFromSidebar: boolean;
  initialIsSingleSection?: boolean;
  onSave: (data: {
    title: string;
    content: string;
    colorPreset: ColorPreset;
    hideFromSidebar: boolean;
    isSingleSection?: boolean;
  }) => void;
  onCancel: () => void;
}

export function SectionEditForm({
  sectionId,
  initialTitle,
  initialContent,
  initialColor,
  initialHideFromSidebar,
  initialIsSingleSection = false,
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
  const [hideFromSidebar, setHideFromSidebar] = useState(() => {
    const saved = sessionStorage.getItem(`${storageKey}-hide`);
    return saved ? saved === 'true' : initialHideFromSidebar;
  });
  const [isSingleSection, setIsSingleSection] = useState(() => {
    const saved = sessionStorage.getItem(`${storageKey}-single`);
    return saved ? saved === 'true' : initialIsSingleSection;
  });
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Sauvegarder automatiquement l'état lors des modifications
  useEffect(() => {
    sessionStorage.setItem(`${storageKey}-title`, title);
  }, [title, storageKey]);

  useEffect(() => {
    sessionStorage.setItem(`${storageKey}-content`, content);
  }, [content, storageKey]);

  useEffect(() => {
    sessionStorage.setItem(`${storageKey}-color`, color);
  }, [color, storageKey]);

  useEffect(() => {
    sessionStorage.setItem(`${storageKey}-hide`, hideFromSidebar.toString());
  }, [hideFromSidebar, storageKey]);

  useEffect(() => {
    sessionStorage.setItem(`${storageKey}-single`, isSingleSection.toString());
  }, [isSingleSection, storageKey]);

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
    sessionStorage.removeItem(`${storageKey}-hide`);
    sessionStorage.removeItem(`${storageKey}-single`);
  };

  const handleSave = () => {
    onSave({ title, content, colorPreset: color, hideFromSidebar, isSingleSection });
    clearStorage();
  };

  const handleCancel = () => {
    // Vérifier si des modifications ont été faites
    const hasChanges = title !== initialTitle || 
                       content !== initialContent || 
                       color !== initialColor || 
                       hideFromSidebar !== initialHideFromSidebar ||
                       isSingleSection !== initialIsSingleSection;
    
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
          Masquer du sommaire (Tips/Encart)
        </label>
      </div>
      <div className="flex items-center space-x-2 py-2">
        <Checkbox 
          id="isSingleSection" 
          checked={isSingleSection}
          onCheckedChange={(checked) => setIsSingleSection(checked as boolean)}
        />
        <label 
          htmlFor="isSingleSection" 
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
        >
          Section figée (pas de titre, toujours visible)
        </label>
      </div>
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
