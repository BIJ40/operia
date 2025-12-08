import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Download, FileText, Loader2 } from 'lucide-react';
import { exportDocsPdf, downloadPdf } from '@/lib/docsExportPdf';
import { toast } from 'sonner';

interface ExportSection {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

export function DocsExportButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  
  const [sections, setSections] = useState<ExportSection[]>([
    { id: 'modules', label: 'Modules Fonctionnels', description: '10 modules avec routes et permissions', enabled: true },
    { id: 'edgeFunctions', label: 'Edge Functions', description: '41 fonctions avec rate limits', enabled: true },
    { id: 'database', label: 'Base de Données', description: '104 tables par catégorie', enabled: true },
    { id: 'statia', label: 'StatIA', description: 'Moteur de métriques et règles métier', enabled: true },
    { id: 'security', label: 'Sécurité', description: 'Politiques RLS et rôles', enabled: true },
  ]);

  const toggleSection = (id: string) => {
    setSections(prev => prev.map(s => 
      s.id === id ? { ...s, enabled: !s.enabled } : s
    ));
  };

  const handleExport = async () => {
    setIsExporting(true);
    setProgress(0);
    setProgressMessage('Initialisation...');

    try {
      const options = {
        includeModules: sections.find(s => s.id === 'modules')?.enabled,
        includeEdgeFunctions: sections.find(s => s.id === 'edgeFunctions')?.enabled,
        includeDatabase: sections.find(s => s.id === 'database')?.enabled,
        includeStatia: sections.find(s => s.id === 'statia')?.enabled,
        includeSecurity: sections.find(s => s.id === 'security')?.enabled,
      };

      const blob = await exportDocsPdf(options, (p, msg) => {
        setProgress(p);
        setProgressMessage(msg);
      });

      const filename = `helpconfort-documentation-${new Date().toISOString().split('T')[0]}.pdf`;
      downloadPdf(blob, filename);
      
      toast.success('Documentation exportée avec succès');
      setIsOpen(false);
    } catch (error) {
      toast.error('Erreur lors de l\'export');
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
      setProgress(0);
      setProgressMessage('');
    }
  };

  const enabledCount = sections.filter(s => s.enabled).length;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exporter PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-helpconfort-blue" />
            Exporter la Documentation
          </DialogTitle>
          <DialogDescription>
            Sélectionnez les sections à inclure dans le PDF
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {sections.map((section) => (
            <div 
              key={section.id}
              className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <Checkbox
                id={section.id}
                checked={section.enabled}
                onCheckedChange={() => toggleSection(section.id)}
                disabled={isExporting}
              />
              <div className="space-y-1">
                <Label 
                  htmlFor={section.id} 
                  className="text-sm font-medium cursor-pointer"
                >
                  {section.label}
                </Label>
                <p className="text-xs text-muted-foreground">{section.description}</p>
              </div>
            </div>
          ))}
        </div>

        {isExporting && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">{progressMessage}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isExporting}>
            Annuler
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={isExporting || enabledCount === 0}
            className="gap-2"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Export en cours...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Exporter ({enabledCount} sections)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
