import { useParams, Link } from 'react-router-dom';
import { useEditor } from '@/contexts/EditorContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Edit2, Trash2 } from 'lucide-react';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider } from '@/components/ui/sidebar';
import { NavLink } from '@/components/NavLink';
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Header } from '@/components/Header';
import { LoginDialog } from '@/components/LoginDialog';
import { Chatbot } from '@/components/Chatbot';
import { RichTextEditor } from '@/components/RichTextEditor';
import { ImageModal } from '@/components/ImageModal';

export default function Category() {
  const { slug } = useParams();
  const { blocks, isEditMode, updateBlock, deleteBlock, addBlock } = useEditor();
  const { isAuthenticated } = useAuth();
  
  const [loginOpen, setLoginOpen] = useState(false);
  
  const category = blocks.find(b => b.type === 'category' && b.slug === slug);
  const sections = blocks
    .filter(b => b.type === 'section' && b.parentId === category?.id)
    .sort((a, b) => a.order - b.order);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editColor, setEditColor] = useState<'white' | 'green' | 'yellow' | 'red' | 'blue'>('white');

  // Scroll to section if hash is present - MUST be before any early return
  useEffect(() => {
    if (window.location.hash) {
      const sectionId = window.location.hash.substring(1);
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
    }
  }, []);

  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Catégorie introuvable</p>
          <Link to="/">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleEdit = (block: typeof sections[0]) => {
    setEditingId(block.id);
    setEditTitle(block.title);
    setEditContent(block.content);
    setEditColor(block.colorPreset || 'white');
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
      colorPreset: 'white',
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
      default: return 'bg-white border border-border';
    }
  };

  return (
    <>
      <Header onOpenLogin={() => setLoginOpen(true)} />
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
        <Sidebar className="w-64 border-r">
          <SidebarContent>
            <div className="p-4 border-b">
              <Link to="/">
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour aux catégories
                </Button>
              </Link>
            </div>
            
            <SidebarGroup>
              <div className="px-4 py-2">
                <h2 className="font-semibold text-lg">{category.title}</h2>
              </div>
              <SidebarGroupContent>
                <SidebarMenu>
                  {sections.map((section) => (
                    <SidebarMenuItem key={section.id}>
                      <SidebarMenuButton asChild>
                        <a href={`#${section.id}`} className="text-sm whitespace-normal leading-snug py-2 h-auto min-h-[2.5rem]">
                          {section.title}
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {isEditMode && isAuthenticated && (
              <div className="p-4 border-t mt-auto">
                <Button onClick={handleAddSection} size="sm" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter une section
                </Button>
              </div>
            )}
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 overflow-y-auto">
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
                    <Select value={editColor} onValueChange={(v: any) => setEditColor(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="white">Blanc</SelectItem>
                        <SelectItem value="green">Vert (bonnes pratiques)</SelectItem>
                        <SelectItem value="yellow">Jaune (astuces)</SelectItem>
                        <SelectItem value="red">Rouge (attention)</SelectItem>
                        <SelectItem value="blue">Bleu (info)</SelectItem>
                      </SelectContent>
                    </Select>
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
        </main>
        </div>
      </SidebarProvider>
      <ImageModal />
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      <Chatbot />
    </>
  );
}
