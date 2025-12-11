/**
 * Bouton d'export complet de la base de données en 3 fichiers
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

  const downloadPart = (data: Record<string, unknown[]>, partNum: number) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `database-export-part${partNum}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    setIsExporting(true);
    setProgress('Initialisation...');
    
    try {
      logInfo('[DatabaseExportButton] Starting 3-part database export...');
      
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error('Non authentifié');

      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      // Export each part separately
      for (let part = 1; part <= 3; part++) {
        setProgress(`Export partie ${part}/3...`);
        
        const res = await fetch(
          `${baseUrl}/functions/v1/export-full-database?part=${part}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.error || `Erreur partie ${part}`);
        }
        
        const data = await res.json();
        downloadPart(data, part);
        
        logInfo(`[DatabaseExportButton] Part ${part} downloaded`);
        
        // Small delay between downloads
        if (part < 3) {
          await new Promise(r => setTimeout(r, 500));
        }
      }

      toast.success('Export réussi', {
        description: '3 fichiers JSON téléchargés',
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
      {isExporting ? progress || 'Export en cours...' : 'Exporter la base (3 fichiers JSON)'}
    </Button>
  );
}
