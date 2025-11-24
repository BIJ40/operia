import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Database, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Navigate, Link } from 'react-router-dom';

export default function AdminBackups() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [exportingApogee, setExportingApogee] = useState(false);
  const [exportingApporteur, setExportingApporteur] = useState(false);
  const [exportingHelpConfort, setExportingHelpConfort] = useState(false);

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const extractPlainText = (html: string): string => {
    if (!html) return '';
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  };

  const cleanHtmlForExport = (html: string): string => {
    if (!html) return '';
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    const cleanElement = (element: Element) => {
      const attributesToKeep = ['href', 'src', 'alt', 'title'];
      const attributes = Array.from(element.attributes);
      
      attributes.forEach(attr => {
        if (!attributesToKeep.includes(attr.name)) {
          element.removeAttribute(attr.name);
        }
      });
      
      Array.from(element.children).forEach(child => cleanElement(child));
    };
    
    cleanElement(temp);
    
    return temp.innerHTML
      .replace(/></g, '>\n<')
      .replace(/\n\s*\n/g, '\n')
      .trim();
  };

  const exportApogeeData = async (format: 'json' | 'txt') => {
    setExportingApogee(true);
    try {
      const { data: blocks, error } = await supabase
        .from('blocks')
        .select('*')
        .order('order');

      if (error) throw error;

      const categories = blocks?.filter(b => b.type === 'category') || [];
      const sections = blocks?.filter(b => b.type === 'section') || [];

      if (format === 'json') {
        const exportData = {
          version: '1.0',
          exportDate: new Date().toISOString(),
          type: 'apogee',
          categories: categories.map(cat => ({
            id: cat.id,
            title: cat.title,
            slug: cat.slug,
            icon: cat.icon,
            colorPreset: cat.color_preset,
            order: cat.order,
            sections: sections
              .filter(s => s.parent_id === cat.id)
              .map(s => ({
                id: s.id,
                title: s.title,
                slug: s.slug,
                contentText: extractPlainText(s.content),
                contentHtml: cleanHtmlForExport(s.content),
                contentRaw: s.content,
                summary: s.summary,
                showSummary: s.show_summary,
                icon: s.icon,
                colorPreset: s.color_preset,
                order: s.order,
                contentType: s.content_type,
                tipsType: s.tips_type,
                hideFromSidebar: s.hide_from_sidebar,
              }))
              .sort((a, b) => a.order - b.order)
          })).sort((a, b) => a.order - b.order),
          stats: {
            totalCategories: categories.length,
            totalSections: sections.length,
          }
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `backup-apogee-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        let textContent = `MANUEL APOGÉE - Export du ${new Date().toLocaleDateString('fr-FR')}\n`;
        textContent += '='.repeat(70) + '\n\n';

        categories.forEach(cat => {
          textContent += `\n${'#'.repeat(70)}\n`;
          textContent += `CATÉGORIE: ${cat.title.toUpperCase()}\n`;
          textContent += `${'#'.repeat(70)}\n\n`;

          const catSections = sections
            .filter(s => s.parent_id === cat.id)
            .sort((a, b) => a.order - b.order);

          catSections.forEach(section => {
            textContent += `\n${'-'.repeat(60)}\n`;
            textContent += `SECTION: ${section.title}\n`;
            textContent += `${'-'.repeat(60)}\n\n`;
            textContent += extractPlainText(section.content);
            textContent += '\n\n';
          });
        });

        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `backup-apogee-texte-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      toast({
        title: `Sauvegarde Apogée ${format.toUpperCase()} réussie !`,
        description: `${categories.length} catégories, ${sections.length} sections exportées`,
      });
    } catch (error) {
      console.error('Erreur export:', error);
      toast({
        title: "Erreur d'export",
        description: 'Impossible d\'exporter les données Apogée',
        variant: 'destructive',
      });
    } finally {
      setExportingApogee(false);
    }
  };

  const exportApporteurData = async (format: 'json' | 'txt') => {
    setExportingApporteur(true);
    try {
      const { data: blocks, error } = await supabase
        .from('apporteur_blocks')
        .select('*')
        .order('order');

      if (error) throw error;

      const categories = blocks?.filter(b => b.type === 'category') || [];
      const sections = blocks?.filter(b => b.type === 'section') || [];

      if (format === 'json') {
        const exportData = {
          version: '1.0',
          exportDate: new Date().toISOString(),
          type: 'apporteur',
          categories: categories.map(cat => ({
            id: cat.id,
            title: cat.title,
            slug: cat.slug,
            icon: cat.icon,
            colorPreset: cat.color_preset,
            order: cat.order,
            isSingleSection: cat.is_single_section,
            showTitleInMenu: cat.show_title_in_menu,
            showTitleOnCard: cat.show_title_on_card,
            sections: sections
              .filter(s => s.parent_id === cat.id)
              .map(s => ({
                id: s.id,
                title: s.title,
                slug: s.slug,
                contentText: extractPlainText(s.content),
                contentHtml: cleanHtmlForExport(s.content),
                contentRaw: s.content,
                summary: s.summary,
                showSummary: s.show_summary,
                icon: s.icon,
                colorPreset: s.color_preset,
                order: s.order,
                contentType: s.content_type,
                tipsType: s.tips_type,
                hideFromSidebar: s.hide_from_sidebar,
              }))
              .sort((a, b) => a.order - b.order)
          })).sort((a, b) => a.order - b.order),
          stats: {
            totalCategories: categories.length,
            totalSections: sections.length,
          }
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `backup-apporteur-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        let textContent = `GUIDE APPORTEUR - Export du ${new Date().toLocaleDateString('fr-FR')}\n`;
        textContent += '='.repeat(70) + '\n\n';

        categories.forEach(cat => {
          textContent += `\n${'#'.repeat(70)}\n`;
          textContent += `CATÉGORIE: ${cat.title.toUpperCase()}\n`;
          textContent += `${'#'.repeat(70)}\n\n`;

          const catSections = sections
            .filter(s => s.parent_id === cat.id)
            .sort((a, b) => a.order - b.order);

          catSections.forEach(section => {
            textContent += `\n${'-'.repeat(60)}\n`;
            textContent += `SECTION: ${section.title}\n`;
            textContent += `${'-'.repeat(60)}\n\n`;
            textContent += extractPlainText(section.content);
            textContent += '\n\n';
          });
        });

        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `backup-apporteur-texte-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      toast({
        title: `Sauvegarde Apporteurs ${format.toUpperCase()} réussie !`,
        description: `${categories.length} catégories, ${sections.length} sections exportées`,
      });
    } catch (error) {
      console.error('Erreur export:', error);
      toast({
        title: "Erreur d'export",
        description: 'Impossible d\'exporter les données Apporteurs',
        variant: 'destructive',
      });
    } finally {
      setExportingApporteur(false);
    }
  };

  const exportHelpConfortData = async (format: 'json' | 'txt') => {
    setExportingHelpConfort(true);
    try {
      const { data: blocks, error } = await supabase
        .from('blocks')
        .select('*')
        .ilike('slug', 'helpconfort-%')
        .order('order');

      if (error) throw error;

      const categories = blocks?.filter(b => b.type === 'category') || [];
      const sections = blocks?.filter(b => b.type === 'section') || [];

      if (format === 'json') {
        const exportData = {
          version: '1.0',
          exportDate: new Date().toISOString(),
          type: 'helpconfort',
          categories: categories.map(cat => ({
            id: cat.id,
            title: cat.title,
            slug: cat.slug,
            icon: cat.icon,
            colorPreset: cat.color_preset,
            order: cat.order,
            sections: sections
              .filter(s => s.parent_id === cat.id)
              .map(s => ({
                id: s.id,
                title: s.title,
                slug: s.slug,
                contentText: extractPlainText(s.content),
                contentHtml: cleanHtmlForExport(s.content),
                contentRaw: s.content,
                summary: s.summary,
                showSummary: s.show_summary,
                icon: s.icon,
                colorPreset: s.color_preset,
                order: s.order,
                contentType: s.content_type,
                tipsType: s.tips_type,
                hideFromSidebar: s.hide_from_sidebar,
              }))
              .sort((a, b) => a.order - b.order)
          })).sort((a, b) => a.order - b.order),
          stats: {
            totalCategories: categories.length,
            totalSections: sections.length,
          }
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `backup-helpconfort-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        let textContent = `BASE HELPCONFORT - Export du ${new Date().toLocaleDateString('fr-FR')}\n`;
        textContent += '='.repeat(70) + '\n\n';

        categories.forEach(cat => {
          textContent += `\n${'#'.repeat(70)}\n`;
          textContent += `CATÉGORIE: ${cat.title.toUpperCase()}\n`;
          textContent += `${'#'.repeat(70)}\n\n`;

          const catSections = sections
            .filter(s => s.parent_id === cat.id)
            .sort((a, b) => a.order - b.order);

          catSections.forEach(section => {
            textContent += `\n${'-'.repeat(60)}\n`;
            textContent += `SECTION: ${section.title}\n`;
            textContent += `${'-'.repeat(60)}\n\n`;
            textContent += extractPlainText(section.content);
            textContent += '\n\n';
          });
        });

        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `backup-helpconfort-texte-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      toast({
        title: `Sauvegarde HelpConfort ${format.toUpperCase()} réussie !`,
        description: `${categories.length} catégories, ${sections.length} sections exportées`,
      });
    } catch (error) {
      console.error('Erreur export:', error);
      toast({
        title: "Erreur d'export",
        description: 'Impossible d\'exporter les données HelpConfort',
        variant: 'destructive',
      });
    } finally {
      setExportingHelpConfort(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Database className="w-8 h-8 text-primary" />
            Sauvegardes
          </h1>
          <p className="text-muted-foreground">
            Exportez vos guides au format TXT ou JSON
          </p>
        </div>
        <Link to="/admin">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour admin
          </Button>
        </Link>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Guide Apogée</CardTitle>
            <CardDescription>
              Exportez le guide Apogée
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button
                onClick={() => exportApogeeData('txt')}
                disabled={exportingApogee}
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                {exportingApogee ? 'Export...' : 'EXPORT .TXT'}
              </Button>
              <Button
                onClick={() => exportApogeeData('json')}
                disabled={exportingApogee}
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                {exportingApogee ? 'Export...' : 'EXPORT .JSON'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Guide Apporteurs</CardTitle>
            <CardDescription>
              Exportez le guide Apporteurs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button
                onClick={() => exportApporteurData('txt')}
                disabled={exportingApporteur}
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                {exportingApporteur ? 'Export...' : 'EXPORT .TXT'}
              </Button>
              <Button
                onClick={() => exportApporteurData('json')}
                disabled={exportingApporteur}
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                {exportingApporteur ? 'Export...' : 'EXPORT .JSON'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Guide HelpConfort</CardTitle>
            <CardDescription>
              Exportez le guide HelpConfort
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button
                onClick={() => exportHelpConfortData('txt')}
                disabled={exportingHelpConfort}
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                {exportingHelpConfort ? 'Export...' : 'EXPORT .TXT'}
              </Button>
              <Button
                onClick={() => exportHelpConfortData('json')}
                disabled={exportingHelpConfort}
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                {exportingHelpConfort ? 'Export...' : 'EXPORT .JSON'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
