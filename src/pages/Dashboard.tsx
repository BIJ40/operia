import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Settings, Plus } from 'lucide-react';
import { LoginDialog } from '@/components/LoginDialog';
import { Header } from '@/components/Header';
import { SidebarProvider } from '@/components/ui/sidebar';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import helpConfortServicesImg from '@/assets/help-confort-services.png';
import { FavoritesWidget } from '@/components/widgets/FavoritesWidget';
import { RecentHistoryWidget } from '@/components/widgets/RecentHistoryWidget';
import { QuickSearchWidget } from '@/components/widgets/QuickSearchWidget';
import { TipOfTheDayWidget } from '@/components/widgets/TipOfTheDayWidget';
import { RecentDocumentsWidget } from '@/components/widgets/RecentDocumentsWidget';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface WidgetConfig {
  key: string;
  title: string;
  component: React.ComponentType<any>;
  defaultSize: 'small' | 'medium' | 'large';
}

const AVAILABLE_WIDGETS: WidgetConfig[] = [
  {
    key: 'favorites',
    title: 'Mes favoris',
    component: FavoritesWidget,
    defaultSize: 'medium'
  },
  {
    key: 'recent-history',
    title: 'Dernières consultations',
    component: RecentHistoryWidget,
    defaultSize: 'medium'
  },
  {
    key: 'quick-search',
    title: 'Recherche rapide',
    component: QuickSearchWidget,
    defaultSize: 'medium'
  },
  {
    key: 'tip-of-day',
    title: 'Astuce du jour',
    component: TipOfTheDayWidget,
    defaultSize: 'medium'
  },
  {
    key: 'recent-documents',
    title: 'Documents récents',
    component: RecentDocumentsWidget,
    defaultSize: 'medium'
  }
];

interface WidgetPreference {
  widget_key: string;
  is_enabled: boolean;
  display_order: number;
  size: 'small' | 'medium' | 'large';
}

export default function Dashboard() {
  const { isAuthenticated, user } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [isConfigMode, setIsConfigMode] = useState(false);
  const [preferences, setPreferences] = useState<WidgetPreference[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoginOpen(true);
    } else {
      loadPreferences();
    }
  }, [isAuthenticated]);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_widget_preferences')
        .select('*')
        .eq('user_id', user.id)
        .order('display_order');

      if (!error && data && data.length > 0) {
        setPreferences(data.map(d => ({
          ...d,
          size: d.size as 'small' | 'medium' | 'large'
        })));
      } else {
        // Initialiser avec tous les widgets activés
        const defaultPreferences = AVAILABLE_WIDGETS.map((widget, index) => ({
          widget_key: widget.key,
          is_enabled: true,
          display_order: index,
          size: widget.defaultSize
        }));
        setPreferences(defaultPreferences);
        
        // Sauvegarder en DB
        if (user) {
          await Promise.all(
            defaultPreferences.map(pref =>
              supabase.from('user_widget_preferences').insert({
                user_id: user.id,
                ...pref
              })
            )
          );
        }
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleWidget = async (widgetKey: string) => {
    if (!user) return;

    const pref = preferences.find(p => p.widget_key === widgetKey);
    const newEnabled = !pref?.is_enabled;

    // Mettre à jour localement
    setPreferences(prev =>
      prev.map(p =>
        p.widget_key === widgetKey ? { ...p, is_enabled: newEnabled } : p
      )
    );

    // Mettre à jour en DB
    await supabase
      .from('user_widget_preferences')
      .upsert({
        user_id: user.id,
        widget_key: widgetKey,
        is_enabled: newEnabled,
        display_order: pref?.display_order || 0,
        size: pref?.size || 'medium'
      }, {
        onConflict: 'user_id,widget_key'
      });
  };

  const removeWidget = async (widgetKey: string) => {
    if (!user) return;

    // Désactiver le widget
    await toggleWidget(widgetKey);
    setIsConfigMode(false);
  };

  const enabledWidgets = preferences
    .filter(p => p.is_enabled)
    .sort((a, b) => a.display_order - b.display_order)
    .map(pref => {
      const config = AVAILABLE_WIDGETS.find(w => w.key === pref.widget_key);
      return config ? { ...config, size: pref.size } : null;
    })
    .filter(Boolean) as (WidgetConfig & { size: 'small' | 'medium' | 'large' })[];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Bienvenue sur Helpogée</h1>
          <p className="text-muted-foreground">Connectez-vous pour accéder à votre dashboard personnalisé</p>
          <Button onClick={() => setLoginOpen(true)}>Se connecter</Button>
        </div>
        <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full flex bg-background">
        <DashboardSidebar />
        
        <div className="flex-1 flex flex-col min-h-screen">
          <Header />
          
          <main className="flex-1 p-6">
            <div className="max-w-7xl mx-auto">
              {/* En-tête avec logo HelpConfort Services */}
              <div className="mb-8 text-center">
                <img 
                  src={helpConfortServicesImg} 
                  alt="HelpConfort Services" 
                  className="h-24 mx-auto mb-4"
                />
                <h1 className="text-3xl font-bold mb-2">Bienvenue sur HelpConfort Services</h1>
                <p className="text-muted-foreground">Votre plateforme centrale de ressources et documentation</p>
              </div>

              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-semibold">Mes widgets</h2>
                  <p className="text-sm text-muted-foreground">Personnalisez votre espace de travail</p>
                </div>
                
                <div className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Widgets
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>Widgets disponibles</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {AVAILABLE_WIDGETS.map(widget => {
                        const pref = preferences.find(p => p.widget_key === widget.key);
                        return (
                          <DropdownMenuCheckboxItem
                            key={widget.key}
                            checked={pref?.is_enabled ?? true}
                            onCheckedChange={() => toggleWidget(widget.key)}
                          >
                            {widget.title}
                          </DropdownMenuCheckboxItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  <Button
                    variant={isConfigMode ? "default" : "outline"}
                    onClick={() => setIsConfigMode(!isConfigMode)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    {isConfigMode ? 'Terminer' : 'Configurer'}
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              ) : enabledWidgets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <p className="text-lg mb-4">Aucun widget activé</p>
                  <Button variant="outline" onClick={() => setIsConfigMode(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter des widgets
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-min">
                  {enabledWidgets.map(widget => {
                    const WidgetComponent = widget.component;
                    return (
                      <WidgetComponent
                        key={widget.key}
                        size={widget.size}
                        isConfigMode={isConfigMode}
                        onRemove={() => removeWidget(widget.key)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
