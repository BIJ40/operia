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

export default function Home() {
  const { blocks, loading, isEditMode, updateBlock, addBlock, deleteBlock } = useEditor();
  const { isAuthenticated } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editColor, setEditColor] = useState<ColorPreset>('white');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  const categories = blocks
    .filter(b => b.type === 'category' && !b.title.toLowerCase().includes('faq'))
    .sort((a, b) => a.order - b.order);

  // Recherche dans les sections et catégories
  const searchResults = searchQuery.trim() ? (() => {
    const searchLower = searchQuery.toLowerCase();
    const results: Array<{ type: 'category' | 'section', block: any, parentCategory?: any }> = [];

    categories.forEach(cat => {
      // Chercher dans la catégorie
      if (cat.title.toLowerCase().includes(searchLower) || 
          cat.content.toLowerCase().includes(searchLower)) {
        results.push({ type: 'category', block: cat });
      }

      // Chercher dans les sections de cette catégorie
      const sections = blocks.filter(b => b.type === 'section' && b.parentId === cat.id);
      sections.forEach(section => {
        if (section.title.toLowerCase().includes(searchLower) || 
            section.content.toLowerCase().includes(searchLower)) {
          results.push({ type: 'section', block: section, parentCategory: cat });
        }
      });
    });

    return results;
  })() : [];

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
      case 'gray': return 'bg-gray-50 border-gray-200 hover:bg-gray-100';
      case 'blanc': return 'bg-card border-border hover:bg-accent';
      case 'white': return 'bg-red-50 border-red-200 hover:bg-red-100'; // White ancien = rouge
      default: return 'bg-red-50 border-red-200 hover:bg-red-100'; // Rouge par défaut
    }
  };

  const handleAddCategory = () => {
    const order = categories.length;
    addBlock({
      type: 'category',
      title: 'Nouvelle catégorie',
      content: '',
      colorPreset: 'red',
      icon: 'BookOpen',
      slug: `categorie-${Date.now()}`,
      attachments: [],
    });
  };

  const handleDeleteClick = (categoryId: string) => {
    setCategoryToDelete(categoryId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (categoryToDelete) {
      deleteBlock(categoryToDelete);
      setCategoryToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Ouvrir le chatbot avec la question
      const chatButton = document.querySelector('[data-chatbot-trigger]') as HTMLElement;
      if (chatButton) {
        chatButton.click();
        // Passer la question au chatbot via un événement personnalisé
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('chatbot-question', { detail: searchQuery }));
        }, 100);
      }
    }
  };

  const handleEdit = (id: string) => {
    const cat = categories.find(c => c.id === id);
    if (cat) {
      setEditingId(id);
      setEditTitle(cat.title);
      setEditIcon(cat.icon || 'BookOpen');
      setEditColor(cat.colorPreset || 'red');
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
    <>
      <div className="px-4 py-8 max-w-7xl mx-auto w-full">
      <div className="mb-6 flex items-center gap-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher avec Mme MICHU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </form>
        {isEditMode && isAuthenticated && (
          <Button onClick={handleAddCategory}>
            <Plus className="w-4 h-4 mr-2" />
            Ajouter une catégorie
          </Button>
        )}
      </div>

            {searchQuery.trim() ? (
              // Afficher les résultats de recherche
              <div className="space-y-4">
                {searchResults.map((result, idx) => {
                  const Icon = result.type === 'category' 
                    ? IconComponent(result.block.icon || 'BookOpen')
                    : IconComponent(result.parentCategory?.icon || 'BookOpen');
                  
                  const targetUrl = result.type === 'category'
                    ? `/category/${result.block.slug}`
                    : `/category/${result.parentCategory?.slug}#${result.block.id}`;

                  return (
                    <Link 
                      key={`${result.type}-${result.block.id}-${idx}`}
                      to={targetUrl}
                      className="block border-2 rounded-lg p-4 hover:shadow-lg transition-all bg-card border-border hover:bg-accent"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {result.type === 'section' && (
                              <span className="text-xs text-muted-foreground">
                                {result.parentCategory?.title} →
                              </span>
                            )}
                            <h3 className="font-semibold text-lg">{result.block.title}</h3>
                          </div>
                          {result.block.content && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {result.block.content.replace(/<[^>]*>/g, '').substring(0, 150)}
                              {result.block.content.length > 150 && '...'}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
                {searchResults.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">Aucun résultat trouvé pour "{searchQuery}"</p>
                    <Button onClick={() => setSearchQuery('')} variant="outline">
                      Effacer la recherche
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              // Afficher les catégories normalement
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
                                  onClick={() => setEditColor(colorOption.value as ColorPreset)}
                                  className={`w-8 h-8 rounded-full ${colorOption.color} transition-all hover:scale-110 ${
                                    editColor === colorOption.value 
                                      ? 'ring-4 ring-primary ring-offset-2' 
                                      : ''
                                  }`}
                                  title={colorOption.label}
                                />
                              ))}
                            </div>
                          </div>
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
                                onClick={() => handleDeleteClick(category.id)}
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
            )}

            {categories.length === 0 && !searchQuery.trim() && (
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette catégorie et toutes ses sections ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
