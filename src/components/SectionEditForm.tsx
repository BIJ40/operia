import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RichTextEditor } from '@/components/RichTextEditor';
import { ColorPreset } from '@/types/block';
import { useState } from 'react';

interface SectionEditFormProps {
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
  initialTitle,
  initialContent,
  initialColor,
  initialHideFromSidebar,
  onSave,
  onCancel,
}: SectionEditFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [color, setColor] = useState<ColorPreset>(initialColor);
  const [hideFromSidebar, setHideFromSidebar] = useState(initialHideFromSidebar);

  const handleSave = () => {
    onSave({ title, content, colorPreset: color, hideFromSidebar });
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
      <div className="flex gap-2">
        <Button onClick={handleSave}>Enregistrer</Button>
        <Button variant="outline" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </div>
  );
}
