import { useEditor } from '@/contexts/EditorContext';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { LoginDialog } from '@/components/LoginDialog';
import { Chatbot } from '@/components/Chatbot';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ColorPreset } from '@/types/block';
import { Plus, Trash2 } from 'lucide-react';

export default function Home() {
  const { blocks, loading, isEditMode, updateBlock, addBlock, deleteBlock } = useEditor();
  const { isAuthenticated } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editColor, setEditColor] = useState<ColorPreset>('white');

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
    <div className="min-h-screen bg-background">
      <Header onOpenLogin={() => setLoginOpen(true)} />

      <main className="container mx-auto px-4 py-8">
        {isEditMode && isAuthenticated && (
          <div className="mb-6 flex justify-end">
            <Button onClick={handleAddCategory}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter une catégorie
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                    <Input
                      value={editIcon}
                      onChange={(e) => setEditIcon(e.target.value)}
                      placeholder="Nom icône (ex: BookOpen)"
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
      </main>

      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      <Chatbot />
    </div>
  );
}
