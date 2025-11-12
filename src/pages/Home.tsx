import { useEditor } from '@/contexts/EditorContext';
import { EditorToolbar } from '@/components/EditorToolbar';
import { Button } from '@/components/ui/button';
import { Plus, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { LoginDialog } from '@/components/LoginDialog';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/Header';

export default function Home() {
  const { blocks, isEditMode, addBlock, updateBlock, deleteBlock, resetToDefault, loading } = useEditor();
  const { isAuthenticated } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editIcon, setEditIcon] = useState('');

  const categories = blocks
    .filter(b => b.type === 'category' && !b.title.toLowerCase().includes('faq'))
    .sort((a, b) => a.order - b.order);

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

  const handleEditCategory = (id: string) => {
    const cat = categories.find(c => c.id === id);
    if (cat) {
      setEditingId(id);
      setEditTitle(cat.title);
      setEditIcon(cat.icon || 'BookOpen');
    }
  };

  const handleSaveEdit = () => {
    if (editingId) {
      updateBlock(editingId, { title: editTitle, icon: editIcon });
      setEditingId(null);
    }
  };

  const IconComponent = (iconName: string) => {
    const Icon = (Icons as any)[iconName] || Icons.BookOpen;
    return Icon;
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
      <Header />
      
      {!isAuthenticated && (
        <div className="border-b bg-muted/30">
          <div className="container mx-auto px-4 py-3 flex justify-end">
            <Button onClick={() => setLoginOpen(true)} variant="outline" size="sm">
              <LogIn className="w-4 h-4 mr-2" />
              Connexion Admin
            </Button>
          </div>
        </div>
      )}

      <EditorToolbar />

      <main className="container mx-auto px-4 py-8">
        {isEditMode && (
          <div className="mb-6 flex justify-end gap-2">
            <Button onClick={resetToDefault} variant="outline">
              Réinitialiser les données
            </Button>
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
                className="group relative bg-card border-2 rounded-lg p-6 hover:shadow-lg transition-all"
              >
                {editingId === category.id ? (
                  <div className="space-y-3">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Titre"
                    />
                    <Input
                      value={editIcon}
                      onChange={(e) => setEditIcon(e.target.value)}
                      placeholder="Nom icône (ex: BookOpen)"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveEdit}>OK</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                        ✕
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
                    
                    {isEditMode && (
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditCategory(category.id)}
                        >
                          ✏️
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteBlock(category.id)}
                        >
                          🗑️
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
            {isEditMode && (
              <Button onClick={handleAddCategory}>
                <Plus className="w-4 h-4 mr-2" />
                Créer la première catégorie
              </Button>
            )}
          </div>
        )}
      </main>

      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </div>
  );
}
