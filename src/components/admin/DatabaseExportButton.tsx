/**
 * Bouton d'export complet de la base de données (RGPD Article 20)
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logError } from '@/lib/logger';

export function DatabaseExportButton() {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('export-full-database', {
        body: {},
      });

      if (error) throw error;

      // Créer et télécharger le fichier JSON
      const blob = new Blob([JSON.stringify(data, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `export-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Export téléchargé avec succès');
    } catch (err: any) {
      logError('[DatabaseExportButton] Export error:', err);
      toast.error(err.message || 'Erreur lors de l\'export');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button 
      onClick={handleExport} 
      disabled={isExporting}
      variant="outline"
      className="gap-2"
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {isExporting ? 'Export en cours...' : 'Exporter toutes mes données (JSON)'}
    </Button>
  );
}
