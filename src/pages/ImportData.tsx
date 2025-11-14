import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import backupData from '@/data/backup-restore.json';

export default function ImportData() {
  const [importing, setImporting] = useState(false);
  const [status, setStatus] = useState('');
  const { toast } = useToast();

  const importBlocks = async () => {
    setImporting(true);
    setStatus('Importation en cours...');

    try {
      // Supprimer les données existantes
      const { error: deleteError } = await supabase
        .from('blocks')
        .delete()
        .neq('id', '');

      if (deleteError) throw deleteError;

      setStatus(`Suppression des anciennes données... OK`);

      // Importer les nouveaux blocks
      const { error: insertError } = await supabase
        .from('blocks')
        .insert(backupData.blocks);

      if (insertError) throw insertError;

      setStatus(`✅ ${backupData.blocks.length} blocks importés avec succès !`);
      
      toast({
        title: "Import réussi !",
        description: `${backupData.blocks.length} blocks ont été restaurés.`,
      });

    } catch (error: any) {
      setStatus(`❌ Erreur: ${error.message}`);
      toast({
        title: "Erreur d'import",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-4">Import des données</h1>
      
      <div className="bg-card p-6 rounded-lg border mb-4">
        <p className="mb-4">
          Cliquez sur le bouton ci-dessous pour importer vos données sauvegardées
          dans la base de données Supabase.
        </p>
        
        <Button 
          onClick={importBlocks}
          disabled={importing}
          size="lg"
        >
          {importing ? 'Import en cours...' : 'Importer les données'}
        </Button>
      </div>

      {status && (
        <div className="bg-muted p-4 rounded-lg">
          <pre className="whitespace-pre-wrap">{status}</pre>
        </div>
      )}
    </div>
  );
}