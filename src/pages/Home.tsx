import { useEditor } from '@/contexts/EditorContext';
import { useState } from 'react';
import { LoginDialog } from '@/components/LoginDialog';
import { Chatbot } from '@/components/Chatbot';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Header } from '@/components/Header';

export default function Home() {
  const { blocks, loading } = useEditor();
  const [loginOpen, setLoginOpen] = useState(false);

  const categories = blocks
    .filter(b => b.type === 'category' && !b.title.toLowerCase().includes('faq'))
    .sort((a, b) => a.order - b.order);

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
      <Header onOpenLogin={() => setLoginOpen(true)} />

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((category) => {
            const Icon = IconComponent(category.icon || 'BookOpen');
            
            return (
              <Link 
                key={category.id} 
                to={`/category/${category.slug}`}
                className="group relative bg-card border-2 rounded-lg p-6 hover:shadow-lg transition-all"
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">{category.title}</h3>
                </div>
              </Link>
            );
          })}
        </div>

        {categories.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Aucune catégorie disponible</p>
          </div>
        )}
      </main>

      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      <Chatbot />
    </div>
  );
}
