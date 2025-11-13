import { useEditor } from '@/contexts/EditorContext';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { IconPicker } from '@/components/IconPicker';
import { ColorPreset } from '@/types/block';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function Home() {
  const { blocks, isEditMode, toggleEditMode, addBlock, updateBlock } = useEditor();
  const { isAuthenticated, isAdmin, login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editColor, setEditColor] = useState<ColorPreset>('blue');

  // Récupérer les 3 cartes guides
  const guides = blocks.filter(b => b.type === 'guide').sort((a, b) => a.order - b.order);

  // S'assurer que les 3 guides existent
  if (guides.length === 0 && isAdmin) {
    // Créer les 3 guides par défaut
    addBlock({
      type: 'guide',
      title: "Guide d'utilisation Apogée",
      content: "Toutes les informations pour utiliser Apogée CRM",
      icon: 'BookOpen',
      colorPreset: 'blue',
      slug: 'apogee',
      attachments: []
    });
    addBlock({
      type: 'guide',
      title: 'Guide des apporteurs nationaux',
      content: 'Informations sur les apporteurs nationaux',
      icon: 'Users',
      colorPreset: 'green',
      slug: 'apporteurs',
      attachments: []
    });
    addBlock({
      type: 'guide',
      title: 'Informations utiles',
      content: 'Ressources et informations complémentaires',
      icon: 'Info',
      colorPreset: 'purple',
      slug: 'informations',
      attachments: []
    });
  }

  const IconComponent = (iconName: string) => {
    const Icon = (Icons as any)[iconName] || Icons.BookOpen;
    return Icon;
  };

  const getColorClass = (color?: ColorPreset) => {
    const colorMap: Record<ColorPreset, string> = {
      red: 'bg-red-50 border-red-200 hover:bg-red-100',
      blanc: 'bg-white border-gray-200 hover:bg-gray-50',
      white: 'bg-white border-gray-200 hover:bg-gray-50',
      gray: 'bg-gray-50 border-gray-200 hover:bg-gray-100',
      green: 'bg-green-50 border-green-200 hover:bg-green-100',
      yellow: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
      blue: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
      purple: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
      pink: 'bg-pink-50 border-pink-200 hover:bg-pink-100',
      orange: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
      cyan: 'bg-cyan-50 border-cyan-200 hover:bg-cyan-100',
      indigo: 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100',
      teal: 'bg-teal-50 border-teal-200 hover:bg-teal-100',
      rose: 'bg-rose-50 border-rose-200 hover:bg-rose-100',
    };
    return colorMap[color || 'white'];
  };

  const handleEdit = (guide: any) => {
    setEditingCardId(guide.id);
    setEditTitle(guide.title);
    setEditDescription(guide.content);
    setEditIcon(guide.icon || 'BookOpen');
    setEditColor(guide.colorPreset);
  };

  const handleSave = () => {
    if (editingCardId) {
      updateBlock(editingCardId, {
        title: editTitle,
        content: editDescription,
        icon: editIcon,
        colorPreset: editColor,
      });
      setEditingCardId(null);
      toast.success('Guide mis à jour');
    }
  };

  const handleCancel = () => {
    setEditingCardId(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);

    const result = await login(email, password);
    
    if (result.success) {
      toast.success('Connexion réussie');
      setEmail('');
      setPassword('');
    } else {
      toast.error(result.error || 'Erreur de connexion');
    }
    
    setIsLoggingIn(false);
  };

  return (
    <div className="container max-w-6xl mx-auto p-8">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-4xl font-bold">Bienvenue sur Help Apogée</h1>
            <p className="text-muted-foreground mt-2">
              Choisissez le guide qui vous intéresse
            </p>
          </div>
          {isAdmin && (
            <Button
              onClick={toggleEditMode}
              variant={isEditMode ? "default" : "outline"}
            >
              {isEditMode ? 'Terminer' : 'Mode édition'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {guides.map((guide) => {
          const Icon = IconComponent(guide.icon || 'BookOpen');
          
          if (editingCardId === guide.id) {
            return (
              <Card key={guide.id} className={`${getColorClass(editColor)} border-2`}>
                <CardHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Titre</Label>
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Titre du guide"
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Input
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Description"
                      />
                    </div>
                    <div>
                      <Label>Icône</Label>
                      <IconPicker value={editIcon} onChange={setEditIcon} />
                    </div>
                    <div>
                      <Label>Couleur</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {['blue', 'green', 'purple', 'red', 'orange', 'cyan'].map((color) => (
                          <button
                            key={color}
                            onClick={() => setEditColor(color as ColorPreset)}
                            className={`w-8 h-8 rounded border-2 ${getColorClass(color as ColorPreset)} ${
                              editColor === color ? 'ring-2 ring-primary' : ''
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button onClick={handleSave} size="sm" className="flex-1">
                      Enregistrer
                    </Button>
                    <Button onClick={handleCancel} variant="outline" size="sm" className="flex-1">
                      Annuler
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          }

          return (
            <Card 
              key={guide.id}
              className={`${getColorClass(guide.colorPreset)} border-2 hover:shadow-lg transition-all cursor-pointer group relative`}
            >
              {isEditMode && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.preventDefault();
                    handleEdit(guide);
                  }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                  <Icons.Edit2 className="w-4 h-4" />
                </Button>
              )}
              <Link to={`/guide/${guide.slug}`} className="block">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 rounded-lg bg-background/50">
                      <Icon className="w-8 h-8" />
                    </div>
                  </div>
                  <CardTitle className="text-xl">{guide.title}</CardTitle>
                  <CardDescription>{guide.content}</CardDescription>
                </CardHeader>
              </Link>
            </Card>
          );
        })}
      </div>

      {/* Zone de connexion en bas de page */}
      {!isAuthenticated && (
        <div className="border-t pt-8 mt-12">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-lg">Accès administrateur</CardTitle>
              <CardDescription>Connectez-vous pour modifier le contenu</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoggingIn}
                  />
                </div>
                <div>
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoggingIn}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoggingIn}>
                  {isLoggingIn ? 'Connexion...' : 'Se connecter'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
