import { useEditor } from '@/contexts/EditorContext';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IconPicker } from '@/components/IconPicker';
import { ColorPreset } from '@/types/block';
import { Edit2, Check, X } from 'lucide-react';
import { useHomeCards } from '@/hooks/useHomeCards';

export default function Home() {
  const { isEditMode } = useEditor();
  const { isAdmin } = useAuth();
  const { cards, loading, updateCard } = useHomeCards();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIcon, setEditIcon] = useState('BookOpen');
  const [editColor, setEditColor] = useState<ColorPreset>('blue');

  const handleEdit = (card: any) => {
    setEditingId(card.id);
    setEditTitle(card.title);
    setEditDescription(card.description);
    setEditIcon(card.icon);
    setEditColor(card.color_preset);
  };

  const handleSave = async () => {
    if (editingId) {
      await updateCard(editingId, {
        title: editTitle,
        description: editDescription,
        icon: editIcon,
        color_preset: editColor
      });
      setEditingId(null);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  const getColorClass = (color?: string) => {
    switch (color) {
      case 'blue': return 'border-blue-200 bg-blue-50';
      case 'green': return 'border-green-200 bg-green-50';
      case 'orange': return 'border-orange-200 bg-orange-50';
      case 'red': return 'border-red-200 bg-red-50';
      case 'purple': return 'border-purple-200 bg-purple-50';
      case 'yellow': return 'border-yellow-200 bg-yellow-50';
      default: return 'border-border bg-card';
    }
  };

  const IconComponent = (iconName: string) => {
    return (Icons as any)[iconName] || Icons.BookOpen;
  };

  return (
    <div className="container max-w-6xl mx-auto p-8">
      {loading ? (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">Chargement...</p>
        </div>
      ) : (
        <>
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Bienvenue sur le portail HELPCONFORT
            </h1>
            <p className="text-lg text-muted-foreground">
              Accédez à toutes les ressources et guides dont vous avez besoin
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cards.map((card) => {
              const Icon = IconComponent(card.icon);
              
              return (
                <div
                  key={card.id}
                  className={`group relative border-2 rounded-lg p-6 hover:shadow-lg transition-all ${getColorClass(card.color_preset)}`}
                >
              {editingId === card.id ? (
                <div className="space-y-4">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Titre de la carte"
                    autoFocus
                  />
                  <Input
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Description"
                  />
                  <IconPicker
                    value={editIcon}
                    onChange={setEditIcon}
                  />
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Couleur</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 'blue', color: 'bg-blue-50 border-2 border-blue-200', label: 'Bleu' },
                        { value: 'green', color: 'bg-green-50 border-2 border-green-200', label: 'Vert' },
                        { value: 'orange', color: 'bg-orange-50 border-2 border-orange-200', label: 'Orange' },
                        { value: 'red', color: 'bg-red-50 border-2 border-red-200', label: 'Rouge' },
                        { value: 'purple', color: 'bg-purple-50 border-2 border-purple-200', label: 'Violet' },
                        { value: 'yellow', color: 'bg-yellow-50 border-2 border-yellow-200', label: 'Jaune' },
                      ].map((colorOption) => (
                        <button
                          key={colorOption.value}
                          onClick={() => setEditColor(colorOption.value as ColorPreset)}
                          className={`px-3 py-1.5 rounded text-sm ${colorOption.color} ${
                            editColor === colorOption.value ? 'ring-2 ring-primary' : ''
                          }`}
                        >
                          {colorOption.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSave} size="sm">
                      <Check className="w-4 h-4 mr-1" /> Enregistrer
                    </Button>
                    <Button onClick={handleCancel} variant="outline" size="sm">
                      <X className="w-4 h-4 mr-1" /> Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {isEditMode && (
                    <Button
                      onClick={() => handleEdit(card)}
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  )}
                  
                  <Link to={card.link} className="block">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="p-4 bg-background rounded-full">
                        <Icon className="w-12 h-12 text-primary" />
                      </div>
                      <h2 className="text-xl font-semibold text-foreground">
                        {card.title}
                      </h2>
                      <p className="text-muted-foreground">
                        {card.description}
                      </p>
                    </div>
                  </Link>
                </>
              )}
            </div>
          );
        })}
      </div>
        </>
      )}
    </div>
  );
}
