import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Database, RefreshCw, FileJson, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export function QuickActions() {
  const { toast } = useToast();
  const [exportingJson, setExportingJson] = useState(false);
  const [exportingTxt, setExportingTxt] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [indexProgress, setIndexProgress] = useState({ current: 0, total: 0 });

  const extractPlainText = (html: string): string => {
    if (!html) return '';
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  };

  const exportAllJson = async () => {
    setExportingJson(true);
    try {
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

  const exportAllTxt = async () => {
    setExportingTxt(true);
    try {
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

  const handleIndexChatbot = async () => {
    setIndexing(true);
    setIndexProgress({ current: 0, total: 0 });
    
    try {
      const { count: totalBlocks, error: countError } = await supabase
        .from('blocks')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;

      const total = totalBlocks || 0;
      setIndexProgress({ current: 0, total });

      toast({
        title: 'Indexation démarrée',
        description: `${total} blocs à indexer par batches de 50...`,
      });

      const batchSize = 50;
      const totalBatches = Math.ceil(total / batchSize);
      let processedBlocks = 0;
      let totalChunks = 0;

      for (let batch = 0; batch < totalBatches; batch++) {
        const { data, error } = await supabase.functions.invoke('generate-embeddings', {
          body: { 
            blockIds: [], 
            batchSize,
            offset: batch * batchSize 
          },
        });

        if (error) {
          console.error(`Erreur batch ${batch + 1}:`, error);
        } else {
          processedBlocks += data.blocks_processed || 0;
          totalChunks += data.chunks_created || 0;
        }

        setIndexProgress({ current: processedBlocks, total });

        if (batch < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      toast({
        title: 'Indexation terminée',
        description: `${processedBlocks} blocs traités, ${totalChunks} chunks créés`,
      });
      
      setIndexProgress({ current: 0, total: 0 });
    } catch (error) {
      console.error('Erreur indexation:', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur lors de l\'indexation',
        variant: 'destructive',
      });
      setIndexProgress({ current: 0, total: 0 });
    } finally {
      setIndexing(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4 text-foreground">Actions rapides</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Variant 1 - Sauvegardes */}
        <div className="group h-full rounded-xl border border-helpconfort-blue/20 p-5
          bg-gradient-to-br from-white to-helpconfort-blue/5
          shadow-sm transition-all duration-300
          hover:to-helpconfort-blue/15 hover:shadow-lg hover:-translate-y-1">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-full border-2 border-helpconfort-blue/30 flex items-center justify-center
              group-hover:border-helpconfort-blue group-hover:bg-white/50 transition-all shrink-0">
              <Database className="w-5 h-5 text-helpconfort-blue" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="font-semibold text-foreground">Sauvegardes</h3>
                <p className="text-sm text-muted-foreground">Exporter les guides en JSON ou TXT</p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={exportAllJson}
                  disabled={exportingJson}
                  size="sm"
                  className="bg-helpconfort-blue hover:bg-helpconfort-blue/90"
                >
                  <FileJson className="w-4 h-4 mr-1" />
                  {exportingJson ? 'Export...' : 'JSON'}
                </Button>
                <Button
                  onClick={exportAllTxt}
                  disabled={exportingTxt}
                  size="sm"
                  className="bg-helpconfort-blue hover:bg-helpconfort-blue/90"
                >
                  <FileText className="w-4 h-4 mr-1" />
                  {exportingTxt ? 'Export...' : 'TXT'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Variant 2 - MAJ BOT */}
        <div className="group h-full rounded-xl border border-helpconfort-blue/15 p-5
          bg-gradient-to-b from-helpconfort-blue/5 to-white
          shadow-sm transition-all duration-300
          hover:from-helpconfort-blue/15 hover:shadow-lg hover:-translate-y-1">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-lg border-2 border-helpconfort-blue/25 flex items-center justify-center
              group-hover:border-helpconfort-blue group-hover:bg-white transition-all shrink-0">
              <RefreshCw className="w-5 h-5 text-helpconfort-blue" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="font-semibold text-foreground">MAJ BOT (Mme MICHU)</h3>
                <p className="text-sm text-muted-foreground">Réindexer après modification des guides</p>
              </div>
              <Button
                onClick={handleIndexChatbot}
                disabled={indexing}
                size="sm"
                className="bg-helpconfort-blue hover:bg-helpconfort-blue/90"
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${indexing ? 'animate-spin' : ''}`} />
                {indexing ? 'Indexation...' : 'Lancer la MAJ'}
              </Button>

              {indexing && indexProgress.total > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{indexProgress.current} / {indexProgress.total} blocs</span>
                    <span>{Math.round((indexProgress.current / indexProgress.total) * 100)}%</span>
                  </div>
                  <div className="grid grid-cols-20 gap-0.5">
                    {Array.from({ length: 20 }).map((_, i) => {
                      const blockThreshold = (indexProgress.total / 20) * (i + 1);
                      const isFilled = indexProgress.current >= blockThreshold;
                      return (
                        <div
                          key={i}
                          className={`h-2 rounded transition-all duration-300 ${
                            isFilled 
                              ? 'bg-helpconfort-blue shadow-sm' 
                              : 'bg-muted'
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
