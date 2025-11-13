// Force update - color fix for blanc/white
import { useParams, useLocation } from 'react-router-dom';
import { useEditor } from '@/contexts/EditorContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RichTextEditor } from '@/components/RichTextEditor';
import { ColorPreset } from '@/types/block';

export default function Category() {
  const { slug } = useParams();
  const location = useLocation();
  const { blocks, isEditMode, updateBlock, deleteBlock, addBlock } = useEditor();
  const { isAuthenticated } = useAuth();
  
  const category = blocks.find(b => b.type === 'category' && b.slug === slug);
  const sections = blocks
    .filter(b => b.type === 'section' && b.parentId === category?.id)
    .sort((a, b) => a.order - b.order);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editColor, setEditColor] = useState<ColorPreset>('white');

  // Scroll to section if hash is present - MUST be before any early return
  useEffect(() => {
    if (location.hash) {
      const sectionId = location.hash.substring(1);
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
    }
  }, [location.hash]); // Se déclenche à chaque changement de hash

  if (!category) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Catégorie introuvable</p>
      </div>
    );
  }

  const handleEdit = (block: typeof sections[0]) => {
    setEditingId(block.id);
    setEditTitle(block.title);
    setEditContent(block.content);
    setEditColor(block.colorPreset || 'red');
  };

  const handleSave = () => {
    if (editingId) {
      updateBlock(editingId, {
        title: editTitle,
        content: editContent,
        colorPreset: editColor,
      });
      setEditingId(null);
    }
  };

  const handleAddSection = () => {
    addBlock({
      type: 'section',
      title: 'Nouvelle sous-section',
      content: '<p>Contenu de la sous-section...</p>',
      colorPreset: 'red',
      parentId: category.id,
      slug: `${category.slug}-section-${Date.now()}`,
      attachments: [],
    });
  };

  const getColorClass = (color?: string) => {
    switch (color) {
      case 'green': return 'bg-green-50 border-l-4 border-l-green-500';
      case 'yellow': return 'bg-yellow-50 border-l-4 border-l-yellow-500';
      case 'red': return 'bg-red-50 border-l-4 border-l-red-500';
      case 'blue': return 'bg-blue-50 border-l-4 border-l-blue-500';
      case 'purple': return 'bg-purple-50 border-l-4 border-l-purple-500';
      case 'pink': return 'bg-pink-50 border-l-4 border-l-pink-500';
      case 'orange': return 'bg-orange-50 border-l-4 border-l-orange-500';
      case 'cyan': return 'bg-cyan-50 border-l-4 border-l-cyan-500';
      case 'indigo': return 'bg-indigo-50 border-l-4 border-l-indigo-500';
      case 'teal': return 'bg-teal-50 border-l-4 border-l-teal-500';
      case 'rose': return 'bg-rose-50 border-l-4 border-l-rose-500';
      case 'gray': return 'bg-gray-50 border-l-4 border-l-gray-400';
      case 'blanc': return 'bg-white dark:bg-background border-l-4 border-l-border';
      case 'white': return 'bg-red-50 border-l-4 border-l-red-500'; // White ancien = rouge
      default: return 'bg-red-50 border-l-4 border-l-red-500'; // Rouge par défaut
    }
  };

  return (
    <div className="container max-w-4xl mx-auto p-8">
            <h1 className="text-3xl font-bold mb-8">{category.title}</h1>

            {sections.map((section) => (
              <div
                key={section.id}
                id={section.id}
                className={`mb-8 p-6 rounded-lg ${getColorClass(section.colorPreset)}`}
              >
                {editingId === section.id ? (
                  <div className="space-y-4">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Titre"
                      className="font-semibold text-xl"
                    />
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Couleur</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: 'red', color: 'bg-red-500', label: 'Rouge' },
                          { value: 'blanc', color: 'bg-white border-2 border-gray-300', label: 'Blanc' },
                          { value: 'gray', color: 'bg-gray-400', label: 'Gris' },
                          { value: 'green', color: 'bg-green-500', label: 'Vert' },
                          { value: 'yellow', color: 'bg-yellow-500', label: 'Jaune' },
                          { value: 'blue', color: 'bg-blue-500', label: 'Bleu' },
                          { value: 'purple', color: 'bg-purple-500', label: 'Violet' },
                          { value: 'pink', color: 'bg-pink-500', label: 'Rose' },
                          { value: 'orange', color: 'bg-orange-500', label: 'Orange' },
                          { value: 'cyan', color: 'bg-cyan-500', label: 'Cyan' },
                          { value: 'indigo', color: 'bg-indigo-500', label: 'Indigo' },
                          { value: 'teal', color: 'bg-teal-500', label: 'Sarcelle' },
                          { value: 'rose', color: 'bg-rose-500', label: 'Rose foncé' },
                        ].map((colorOption) => (
                          <button
                            key={colorOption.value}
                            type="button"
                            onClick={() => setEditColor(colorOption.value as ColorPreset)}
                            className={`w-8 h-8 rounded-full ${colorOption.color} transition-all hover:scale-110 ${
                              editColor === colorOption.value 
                                ? 'ring-4 ring-primary ring-offset-2' 
                                : 'ring-2 ring-gray-200'
                            }`}
                            title={colorOption.label}
                          />
                        ))}
                      </div>
                    </div>
                    <RichTextEditor
                      content={editContent}
                      onChange={setEditContent}
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleSave}>Enregistrer</Button>
                      <Button variant="outline" onClick={() => setEditingId(null)}>
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-4">
                      <h2 className="text-2xl font-semibold">{section.title}</h2>
                      {isEditMode && isAuthenticated && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(section)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteBlock(section.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div
                      className="prose prose-sm max-w-none break-words overflow-visible"
                      dangerouslySetInnerHTML={{ __html: section.content }}
                    />
                  </>
                )}
              </div>
              ))}
        </div>
  );
}
