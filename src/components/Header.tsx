import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { useEditor } from '@/contexts/EditorContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { IconPicker } from '@/components/IconPicker';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface HeaderProps {
  onOpenLogin?: () => void;
}

export function Header({ onOpenLogin }: HeaderProps) {
  const { blocks, isEditMode, toggleEditMode, updateBlock } = useEditor();
  const { isAuthenticated, logout } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [guideIcon, setGuideIcon] = useState('Home');
  const [faqIcon, setFaqIcon] = useState('HelpCircle');
  const [editIcon, setEditIcon] = useState('Edit3');
  const [stopIcon, setStopIcon] = useState('Square');
  
  // Find FAQ category
  const faqCategory = blocks.find(
    b => b.type === 'category' && b.title.toLowerCase().includes('faq')
  );

  const GuideIconComponent = (Icons as any)[guideIcon] || Icons.Home;
  const FaqIconComponent = (Icons as any)[faqIcon] || Icons.HelpCircle;
  const EditIconComponent = (Icons as any)[editIcon] || Icons.Edit3;
  const StopIconComponent = (Icons as any)[stopIcon] || Icons.Square;

  const handleEnrichirClick = () => {
    if (isEditMode) {
      // Si on est en mode édition, on quitte
      toggleEditMode();
    } else if (isAuthenticated) {
      // Si on est authentifié mais pas en mode édition, on active le mode édition
      toggleEditMode();
    } else {
      // Si on n'est pas authentifié, on ouvre le dialog de login
      onOpenLogin?.();
    }
  };

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center gap-4">
        <Link 
          to="/" 
          className="flex items-center gap-2 px-4 py-2 bg-card border-2 rounded-lg hover:shadow-md transition-all"
        >
          <GuideIconComponent className="w-5 h-5 text-primary" />
          <span className="font-semibold text-foreground">GUIDE</span>
        </Link>
        
        {faqCategory && (
          <Link 
            to={`/category/${faqCategory.slug}`}
            className="flex items-center gap-2 px-4 py-2 bg-card border-2 rounded-lg hover:shadow-md transition-all"
          >
            <FaqIconComponent className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">FAQ</span>
          </Link>
        )}

        <Button
          onClick={handleEnrichirClick}
          variant="ghost"
          className="flex items-center gap-2 px-4 py-2 bg-card border-2 rounded-lg hover:shadow-md transition-all"
        >
          {isEditMode ? (
            <>
              <StopIconComponent className="w-5 h-5 text-destructive" />
              <span className="font-semibold text-foreground">STOP</span>
            </>
          ) : (
            <>
              <EditIconComponent className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">ENRICHIR</span>
            </>
          )}
        </Button>

        {isAuthenticated && (
          <>
            <Button
              onClick={() => setSettingsOpen(true)}
              variant="ghost"
              className="flex items-center gap-2 px-4 py-2 bg-card border-2 rounded-lg hover:shadow-md transition-all"
            >
              <Icons.Settings className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">PARAMÈTRES</span>
            </Button>

            <Button
              onClick={logout}
              variant="ghost"
              className="flex items-center gap-2 px-4 py-2 bg-card border-2 rounded-lg hover:shadow-md transition-all ml-auto"
            >
              <Icons.LogOut className="w-5 h-5 text-muted-foreground" />
              <span className="font-semibold text-foreground">QUITTER</span>
            </Button>
          </>
        )}
      </div>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Paramètres de l'interface</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Icônes du header</h3>
              
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Icône GUIDE</label>
                <IconPicker value={guideIcon} onChange={setGuideIcon} />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Icône FAQ</label>
                <IconPicker value={faqIcon} onChange={setFaqIcon} />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Icône ENRICHIR</label>
                <IconPicker value={editIcon} onChange={setEditIcon} />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Icône STOP</label>
                <IconPicker value={stopIcon} onChange={setStopIcon} />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">Icônes des catégories</h3>
              {blocks.filter(b => b.type === 'category').map((category) => {
                const CategoryIcon = (Icons as any)[category.icon || 'Circle'] || Icons.Circle;
                
                return (
                  <div key={category.id} className="space-y-2">
                    <label className="text-sm text-muted-foreground flex items-center gap-2">
                      <CategoryIcon className="w-4 h-4" />
                      {category.title}
                    </label>
                    <IconPicker 
                      value={category.icon || 'Circle'} 
                      onChange={(icon) => updateBlock(category.id, { icon })}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
