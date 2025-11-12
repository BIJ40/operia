import { useEditor } from '@/contexts/EditorContext';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ColorPreset } from '@/types/block';
import { Plus, Trash2, Search } from 'lucide-react';
import { IconPicker } from '@/components/IconPicker';

export default function Home() {
  const { blocks, loading, isEditMode, updateBlock, addBlock, deleteBlock } = useEditor();
  const { isAuthenticated } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editColor, setEditColor] = useState<ColorPreset>('white');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = blocks
    .filter(b => b.type === 'category' && !b.title.toLowerCase().includes('faq'))
    .sort((a, b) => a.order - b.order);

  const IconComponent = (iconName: string) => {
    const Icon = (Icons as any)[iconName] || Icons.BookOpen;
    return Icon;
  };

  const getColorClass = (color?: ColorPreset) => {
    switch (color) {
      case 'green': return 'bg-green-50 border-green-200 hover:bg-green-100';
      case 'yellow': return 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100';
      case 'red': return 'bg-red-50 border-red-200 hover:bg-red-100';
      case 'blue': return 'bg-blue-50 border-blue-200 hover:bg-blue-100';
      case 'purple': return 'bg-purple-50 border-purple-200 hover:bg-purple-100';
      case 'pink': return 'bg-pink-50 border-pink-200 hover:bg-pink-100';
      case 'orange': return 'bg-orange-50 border-orange-200 hover:bg-orange-100';
      case 'cyan': return 'bg-cyan-50 border-cyan-200 hover:bg-cyan-100';
      case 'indigo': return 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100';
      case 'teal': return 'bg-teal-50 border-teal-200 hover:bg-teal-100';
      case 'rose': return 'bg-rose-50 border-rose-200 hover:bg-rose-100';
      default: return 'bg-card border-border hover:bg-accent';
    }
  };

  const handleAddCategory = () => {
    const order = categories.length;
    addBlock({
      type: 'category',
      title: 'Nouvelle catégorie',
      content: '',
      colorPreset: 'white',
      icon: 'BookOpen',
      slug: `categorie-${Date.now()}`,
      attachments: [],
    });
  };

  const handleEdit = (id: string) => {
    const cat = categories.find(c => c.id === id);
    if (cat) {
      setEditingId(id);
      setEditTitle(cat.title);
      setEditIcon(cat.icon || 'BookOpen');
      setEditColor(cat.colorPreset || 'white');
    }
  };

  const handleSave = () => {
    if (editingId) {
      updateBlock(editingId, { 
        title: editTitle,
        icon: editIcon,
        colorPreset: editColor 
      });
      setEditingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 max-w-7xl mx-auto w-full">
      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher avec Mme MICHU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {isEditMode && isAuthenticated && (
          <Button onClick={handleAddCategory}>
            <Plus className="w-4 h-4 mr-2" />
            Ajouter une catégorie
          </Button>
        )}
      </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((category) => {
                const Icon = IconComponent(category.icon || 'BookOpen');
                
                return (
                  <div
                    key={category.id}
                    className={`group relative border-2 rounded-lg p-6 hover:shadow-lg transition-all ${getColorClass(category.colorPreset)}`}
                  >
                    {editingId === category.id ? (
                      <div className="space-y-3">
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="Titre de la catégorie"
                        />
                        <IconPicker
                          value={editIcon}
                          onChange={setEditIcon}
                        />
                        <Select value={editColor} onValueChange={(v: ColorPreset) => setEditColor(v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="white">Blanc (par défaut)</SelectItem>
                            <SelectItem value="green">Vert</SelectItem>
                            <SelectItem value="yellow">Jaune</SelectItem>
                            <SelectItem value="red">Rouge</SelectItem>
                            <SelectItem value="blue">Bleu</SelectItem>
                            <SelectItem value="purple">Violet</SelectItem>
                            <SelectItem value="pink">Rose</SelectItem>
                            <SelectItem value="orange">Orange</SelectItem>
                            <SelectItem value="cyan">Cyan</SelectItem>
                            <SelectItem value="indigo">Indigo</SelectItem>
                            <SelectItem value="teal">Sarcelle</SelectItem>
                            <SelectItem value="rose">Rose foncé</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSave}>Enregistrer</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                            Annuler
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Link to={`/category/${category.slug}`}>
                          <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                              <Icon className="w-8 h-8 text-primary" />
                            </div>
                            <h3 className="font-semibold text-lg">{category.title}</h3>
                          </div>
                        </Link>
                        {isEditMode && isAuthenticated && (
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(category.id)}
                            >
                              ✏️
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteBlock(category.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {categories.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">Aucune catégorie disponible</p>
                {isEditMode && isAuthenticated && (
                  <Button onClick={handleAddCategory}>
                    <Plus className="w-4 h-4 mr-2" />
                    Créer la première catégorie
                  </Button>
                )}
              </div>
            )}
    </div>
  );
}
