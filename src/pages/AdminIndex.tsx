import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Database, FileText, Shield, FileJson, RefreshCw, ArrowLeft } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function AdminIndex() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [exportingJson, setExportingJson] = useState(false);
  const [exportingTxt, setExportingTxt] = useState(false);
  const [indexing, setIndexing] = useState(false);

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Fonction pour extraire le texte pur sans HTML
  const extractPlainText = (html: string): string => {
    if (!html) return '';
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  };

  // Export JSON consolidé (toutes catégories)
  const exportAllJson = async () => {
    setExportingJson(true);
    try {
      // Export Apogée
      const { data: apogeeBlocks } = await supabase.from('blocks').select('*').order('order');
      const apogeeCategories = apogeeBlocks?.filter(b => b.type === 'category') || [];
      const apogeeSections = apogeeBlocks?.filter(b => b.type === 'section') || [];
      
      const apogeeData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        type: 'apogee',
        categories: apogeeCategories.map(cat => ({
          id: cat.id,
          title: cat.title,
          slug: cat.slug,
          icon: cat.icon,
          colorPreset: cat.color_preset,
          order: cat.order,
          sections: apogeeSections.filter(s => s.parent_id === cat.id).map(s => ({
            id: s.id,
            title: s.title,
            slug: s.slug,
            content: s.content,
            summary: s.summary,
            showSummary: s.show_summary,
            icon: s.icon,
            colorPreset: s.color_preset,
            order: s.order,
            contentType: s.content_type,
            tipsType: s.tips_type,
            hideFromSidebar: s.hide_from_sidebar,
            hideTitle: s.hide_title,
          })).sort((a, b) => a.order - b.order)
        })).sort((a, b) => a.order - b.order)
      };

      // Export Apporteurs
      const { data: apporteurBlocks } = await supabase.from('apporteur_blocks').select('*').order('order');
      const apporteurCategories = apporteurBlocks?.filter(b => b.type === 'category') || [];
      const apporteurSections = apporteurBlocks?.filter(b => b.type === 'section') || [];
      
      const apporteurData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        type: 'apporteur',
        categories: apporteurCategories.map(cat => ({
          id: cat.id,
          title: cat.title,
          slug: cat.slug,
          icon: cat.icon,
          colorPreset: cat.color_preset,
          order: cat.order,
          isSingleSection: cat.is_single_section,
          showTitleInMenu: cat.show_title_in_menu,
          showTitleOnCard: cat.show_title_on_card,
          sections: apporteurSections.filter(s => s.parent_id === cat.id).map(s => ({
            id: s.id,
            title: s.title,
            slug: s.slug,
            content: s.content,
            summary: s.summary,
            showSummary: s.show_summary,
            icon: s.icon,
            colorPreset: s.color_preset,
            order: s.order,
            contentType: s.content_type,
            tipsType: s.tips_type,
            hideFromSidebar: s.hide_from_sidebar,
            hideTitle: s.hide_title,
          })).sort((a, b) => a.order - b.order)
        })).sort((a, b) => a.order - b.order)
      };

      // Export HelpConfort
      const { data: helpConfortBlocks } = await supabase
        .from('blocks')
        .select('*')
        .ilike('slug', 'helpconfort-%')
        .order('order');
      
      const helpConfortData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        type: 'helpconfort',
        blocks: helpConfortBlocks || []
      };

      // Télécharger les 3 fichiers
      const downloads = [
        { data: apogeeData, name: 'apogee' },
        { data: apporteurData, name: 'apporteur' },
        { data: helpConfortData, name: 'helpconfort' }
      ];

      downloads.forEach(({ data, name }) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `export-${name}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      });

      toast({
        title: 'Export JSON réussi !',
        description: '3 fichiers exportés (Apogée, Apporteurs, HelpConfort)',
      });
    } catch (error) {
      console.error('Erreur export:', error);
      toast({
        title: "Erreur d'export",
        description: 'Impossible d\'exporter les données',
        variant: 'destructive',
      });
    } finally {
      setExportingJson(false);
    }
  };

  // Export TXT consolidé (toutes catégories)
  const exportAllTxt = async () => {
    setExportingTxt(true);
    try {
      // Export Apogée
      const { data: apogeeBlocks } = await supabase.from('blocks').select('*').order('order');
      const apogeeCategories = apogeeBlocks?.filter(b => b.type === 'category') || [];
      const apogeeSections = apogeeBlocks?.filter(b => b.type === 'section') || [];
      
      let apogeeText = `MANUEL APOGÉE - Export du ${new Date().toLocaleDateString('fr-FR')}\n${'='.repeat(70)}\n\n`;
      apogeeCategories.forEach(cat => {
        apogeeText += `\n${'#'.repeat(70)}\nCATÉGORIE: ${cat.title.toUpperCase()}\n${'#'.repeat(70)}\n\n`;
        apogeeSections.filter(s => s.parent_id === cat.id).sort((a, b) => a.order - b.order).forEach(section => {
          apogeeText += `\n${'-'.repeat(60)}\nSECTION: ${section.title}\n${'-'.repeat(60)}\n\n${extractPlainText(section.content)}\n\n`;
        });
      });

      // Export Apporteurs
      const { data: apporteurBlocks } = await supabase.from('apporteur_blocks').select('*').order('order');
      const apporteurCategories = apporteurBlocks?.filter(b => b.type === 'category') || [];
      const apporteurSections = apporteurBlocks?.filter(b => b.type === 'section') || [];
      
      let apporteurText = `GUIDE APPORTEUR - Export du ${new Date().toLocaleDateString('fr-FR')}\n${'='.repeat(70)}\n\n`;
      apporteurCategories.forEach(cat => {
        apporteurText += `\n${'#'.repeat(70)}\nCATÉGORIE: ${cat.title.toUpperCase()}\n${'#'.repeat(70)}\n\n`;
        apporteurSections.filter(s => s.parent_id === cat.id).sort((a, b) => a.order - b.order).forEach(section => {
          apporteurText += `\n${'-'.repeat(60)}\nSECTION: ${section.title}\n${'-'.repeat(60)}\n\n${extractPlainText(section.content)}\n\n`;
        });
      });

      // Export HelpConfort
      const { data: helpConfortBlocks } = await supabase
        .from('blocks')
        .select('*')
        .ilike('slug', 'helpconfort-%')
        .order('order');
      
      const helpConfortCategories = helpConfortBlocks?.filter(b => b.type === 'category') || [];
      const helpConfortSections = helpConfortBlocks?.filter(b => b.type === 'section') || [];
      
      let helpConfortText = `GUIDE HELPCONFORT - Export du ${new Date().toLocaleDateString('fr-FR')}\n${'='.repeat(70)}\n\n`;
      helpConfortCategories.forEach(cat => {
        helpConfortText += `\n${'#'.repeat(70)}\nCATÉGORIE: ${cat.title.toUpperCase()}\n${'#'.repeat(70)}\n\n`;
        helpConfortSections.filter(s => s.parent_id === cat.id).sort((a, b) => a.order - b.order).forEach(section => {
          helpConfortText += `\n${'-'.repeat(60)}\nSECTION: ${section.title}\n${'-'.repeat(60)}\n\n${extractPlainText(section.content)}\n\n`;
        });
      });

      // Télécharger les 3 fichiers
      const downloads = [
        { text: apogeeText, name: 'apogee' },
        { text: apporteurText, name: 'apporteur' },
        { text: helpConfortText, name: 'helpconfort' }
      ];

      downloads.forEach(({ text, name }) => {
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `export-${name}-texte-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      });

      toast({
        title: 'Export TXT réussi !',
        description: '3 fichiers exportés (Apogée, Apporteurs, HelpConfort)',
      });
    } catch (error) {
      console.error('Erreur export:', error);
      toast({
        title: "Erreur d'export",
        description: 'Impossible d\'exporter les données',
        variant: 'destructive',
      });
    } finally {
      setExportingTxt(false);
    }
  };

  // Indexation du chatbot
  const handleIndexChatbot = async () => {
    setIndexing(true);
    
    toast({
      title: 'Indexation démarrée',
      description: 'Ce processus peut prendre plusieurs minutes (5-10 min pour 288 blocs)...',
    });

    try {
      // Augmenter le timeout à 15 minutes pour OpenAI embeddings
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 900000); // 15 minutes

      const { data, error } = await supabase.functions.invoke('generate-embeddings', {
        body: { blockIds: [] },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (error) throw error;

      toast({
        title: 'Indexation terminée',
        description: `${data.blocks_processed} blocs traités, ${data.chunks_created} chunks créés`,
      });
    } catch (error) {
      console.error('Erreur indexation:', error);
      
      // Message différent si timeout
      const isTimeout = error instanceof Error && error.message.includes('aborted');
      
      toast({
        title: isTimeout ? 'Timeout' : 'Erreur',
        description: isTimeout 
          ? 'L\'indexation prend trop de temps. Elle continue en arrière-plan, réessayez dans quelques minutes.'
          : 'L\'indexation a peut-être réussi en arrière-plan. Vérifiez dans le chatbot.',
        variant: isTimeout ? 'default' : 'destructive',
      });
    } finally {
      setIndexing(false);
    }
  };

  return (
    <div className="container max-w-6xl mx-auto p-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Administration</h1>
        <Button variant="outline" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour accueil
        </Button>
      </div>
      
      {/* Gestion des utilisateurs */}
      <div>
        <h2 className="text-xl font-semibold text-muted-foreground mb-4">Gestion des utilisateurs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link to="/admin/users">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Utilisateurs
                </CardTitle>
                <CardDescription>
                  Créer et gérer les comptes utilisateurs
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link to="/admin/role-permissions">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Permissions par rôle
                </CardTitle>
                <CardDescription>
                  Gérer les accès aux catégories par rôle
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>

      {/* Gestion des documents */}
      <div>
        <h2 className="text-xl font-semibold text-muted-foreground mb-4">Gestion des documents</h2>
        <div className="grid grid-cols-1 gap-6">
          <Link to="/admin/documents">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Documents
                </CardTitle>
                <CardDescription>
                  Uploader des fichiers (PDF, Word, etc.) pour les rendre accessibles dans les sections du guide. Ils apparaîtront dans l'onglet "Documents" de chaque catégorie.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>

      {/* Sauvegardes & Chatbot */}
      <div>
        <h2 className="text-xl font-semibold text-muted-foreground mb-4">Sauvegardes & Chatbot</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Sauvegardes
              </CardTitle>
              <CardDescription>
                Exporter les guides Apogée, Apporteurs et HelpConfort en JSON ou TXT
              </CardDescription>
            </CardHeader>
            <div className="px-6 pb-6 space-y-2">
              <Button
                onClick={exportAllJson}
                disabled={exportingJson}
                className="w-full"
                variant="default"
              >
                <FileJson className="w-4 h-4 mr-2" />
                {exportingJson ? 'Export en cours...' : 'Export JSON'}
              </Button>
              <Button
                onClick={exportAllTxt}
                disabled={exportingTxt}
                className="w-full"
                variant="default"
              >
                <FileText className="w-4 h-4 mr-2" />
                {exportingTxt ? 'Export en cours...' : 'Export TXT'}
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-primary" />
                MAJ BOT (Mme MICHU)
              </CardTitle>
              <CardDescription>
                Réindexer le contenu pour mettre à jour le chatbot après modification des guides
              </CardDescription>
            </CardHeader>
            <div className="px-6 pb-6">
              <Button
                onClick={handleIndexChatbot}
                disabled={indexing}
                className="w-full"
                variant="default"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {indexing ? 'Indexation en cours...' : 'Lancer la mise à jour'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
