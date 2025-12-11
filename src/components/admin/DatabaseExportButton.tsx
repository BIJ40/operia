/**
 * Bouton d'export complet de la base de données par batches
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logError, logInfo } from '@/lib/logger';

export function DatabaseExportButton() {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState('');

  const handleExport = async () => {
    setIsExporting(true);
    setProgress('Initialisation...');
    
    try {
      logInfo('[DatabaseExportButton] Starting batched database export...');
      
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error('Non authentifié');

      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      // Get metadata first (no batch param)
      const metaRes = await fetch(`${baseUrl}/functions/v1/export-full-database`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const meta = await metaRes.json();

      if (!meta?.total_batches) {
        throw new Error(meta?.error || 'Impossible de récupérer les métadonnées');
      }

      const totalBatches = meta.total_batches;
      const allData: Record<string, unknown[]> = {
        _meta: [{
          export_date: new Date().toISOString(),
          tables_count: meta.total_tables,
        }],
      };

      // Fetch each batch sequentially
      for (let batch = 0; batch < totalBatches; batch++) {
        setProgress(`Batch ${batch + 1}/${totalBatches}...`);
        
        const batchRes = await fetch(
          `${baseUrl}/functions/v1/export-full-database?batch=${batch}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const batchData = await batchRes.json();

        if (batchData?.error) {
          logError(`[DatabaseExportButton] Batch ${batch} error:`, batchData.error);
          continue;
        }

        // Merge batch data
        if (batchData?.data) {
          Object.assign(allData, batchData.data);
        }
      }

      // Create downloadable JSON file
      const blob = new Blob([JSON.stringify(allData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `database-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Export réussi', {
        description: `${Object.keys(allData).length - 1} tables exportées`,
      });
      logInfo('[DatabaseExportButton] Export completed successfully');
    } catch (err: any) {
      logError('[DatabaseExportButton] Export error:', err);
      toast.error(err.message || "Erreur lors de l'export");
    } finally {
      setIsExporting(false);
      setProgress('');
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
      {isExporting ? progress || 'Export en cours...' : 'Exporter la base de données (JSON)'}
    </Button>
  );
}
