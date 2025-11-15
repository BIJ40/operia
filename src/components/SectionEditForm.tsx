import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RichTextEditor } from '@/components/RichTextEditor';
import { ColorPreset } from '@/types/block';
import { useState, useEffect } from 'react';
import { Save, X, Check } from 'lucide-react';

interface SectionEditFormProps {
  sectionId: string;
  initialTitle: string;
  initialContent: string;
  initialColor: ColorPreset;
  initialHideFromSidebar: boolean;
  onSave: (data: {
    title: string;
    content: string;
    colorPreset: ColorPreset;
    hideFromSidebar: boolean;
  }) => void;
  onCancel: () => void;
}

export function SectionEditForm({
  sectionId,
  initialTitle,
  initialContent,
  initialColor,
  initialHideFromSidebar,
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
  const [isSaving, setIsSaving] = useState(false);

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

  // Nettoyer le stockage lors de la sauvegarde ou de l'annulation
  const clearStorage = () => {
    sessionStorage.removeItem(`${storageKey}-title`);
    sessionStorage.removeItem(`${storageKey}-content`);
    sessionStorage.removeItem(`${storageKey}-color`);
    sessionStorage.removeItem(`${storageKey}-hide`);
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    await onSave({ title, content, colorPreset: color, hideFromSidebar });
    clearStorage();
    
    setTimeout(() => setIsSaving(false), 500);
  };

  const handleCancel = () => {
    clearStorage();
    onCancel();
  };

  return (
    <div className="fixed top-20 right-8 w-[800px] max-h-[calc(100vh-120px)] overflow-y-auto bg-background border rounded-lg p-4 shadow-2xl space-y-4 z-50">
      {/* Boutons de sauvegarde en haut */}
      <div className="flex items-center justify-between pb-2 border-b sticky top-0 bg-background z-10">
        <h3 className="font-semibold text-lg">Édition</h3>
        <div className="flex gap-2">
          <Button 
            type="button"
            size="icon"
            onClick={handleSave}
            title="Enregistrer"
            disabled={isSaving}
            className={isSaving ? "bg-green-500 hover:bg-green-500 text-white" : ""}
          >
            {isSaving ? (
              <Check className="h-5 w-5 animate-in zoom-in duration-200" />
            ) : (
              <Save className="h-5 w-5" />
            )}
          </Button>
          <Button 
            type="button"
            size="icon"
            variant="outline"
            onClick={handleCancel}
            title="Annuler"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titre"
        className="font-semibold text-xl"
      />
      <div className="space-y-2">
        <label className="text-sm font-medium">Couleur</label>
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
      <RichTextEditor
        content={content}
        onChange={setContent}
      />
      {/* Boutons supprimés - on utilise uniquement les icônes en haut */}
    </div>
  );
}
