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
import { Plus, Trash2, ChevronRight } from 'lucide-react';
import { IconPicker } from '@/components/IconPicker';
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel,
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import logoApogee from '@/assets/logo_helpogee.png';

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
    <SidebarProvider>
      <div className="min-h-screen w-full flex bg-background">
        {/* Sidebar avec le sommaire complet */}
        <Sidebar className="border-r" collapsible="icon">
          <SidebarHeader className="p-4 border-b">
            <img src={logoApogee} alt="Apogée CRM" className="w-full h-auto" />
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Sommaire</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {categories.map((category) => {
                    const Icon = IconComponent(category.icon || 'BookOpen');
                    const sections = blocks
                      .filter(b => b.type === 'section' && b.parentId === category.id)
                      .sort((a, b) => a.order - b.order);

                    return (
                      <Collapsible key={category.id} className="group/collapsible">
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton className="w-full">
                              <Icon className="w-4 h-4" />
                              <span className="flex-1 text-left">{category.title}</span>
                              <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {sections.map((section) => (
                                <SidebarMenuSubItem key={section.id}>
                                  <SidebarMenuSubButton asChild>
                                    <Link to={`/category/${category.slug}#${section.id}`}>
                                      <span className="text-sm">{section.title}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        {/* Contenu principal */}
        <div className="flex-1 flex flex-col min-h-screen">
          <Header onOpenLogin={() => setLoginOpen(true)} />
          
          <div className="flex items-center gap-2 px-4 py-2 border-b bg-background/95 backdrop-blur">
            <SidebarTrigger />
            <span className="text-sm text-muted-foreground">Menu</span>
          </div>

          <main className="flex-1 px-4 py-8 max-w-7xl mx-auto w-full">
            {isEditMode && isAuthenticated && (
              <div className="mb-6 flex justify-end">
                <Button onClick={handleAddCategory}>
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter une catégorie
                </Button>
              </div>
            )}

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
          </main>
        </div>
      </div>

      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      <Chatbot />
    </SidebarProvider>
  );
}
