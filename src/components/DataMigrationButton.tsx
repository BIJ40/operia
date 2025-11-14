import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, Check, AlertCircle } from 'lucide-react';
import backupData from '@/data/backup-restore.json';

export function DataMigrationButton() {
  const [importing, setImporting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');
  const { toast } = useToast();

  const importData = async () => {
    setImporting(true);
    setStatus('importing');

    try {
      // 1. Supprimer les données existantes
      const { error: deleteError } = await supabase
        .from('blocks')
        .delete()
        .neq('id', '');

      if (deleteError) throw deleteError;

      // 2. Importer les nouveaux blocks
      const { error: insertError } = await supabase
        .from('blocks')
        .insert(backupData.blocks);

      if (insertError) throw insertError;

      setStatus('success');
      toast({
        title: "✅ Import réussi !",
        description: `${backupData.blocks.length} blocks ont été restaurés dans Supabase.`,
      });

      // Recharger la page après 2 secondes
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error: any) {
      setStatus('error');
      console.error('Erreur import:', error);
      toast({
        title: "❌ Erreur d'import",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const getButtonContent = () => {
    switch (status) {
      case 'importing':
        return (
          <>
            <Upload className="w-4 h-4 animate-pulse" />
            Import en cours...
          </>
        );
      case 'success':
        return (
          <>
            <Check className="w-4 h-4" />
            Importé avec succès !
          </>
        );
      case 'error':
        return (
          <>
            <AlertCircle className="w-4 h-4" />
            Erreur - Réessayer
          </>
        );
      default:
        return (
          <>
            <Upload className="w-4 h-4" />
            Restaurer mes {backupData.blocks.length} blocks
          </>
        );
    }
  };

  return (
    <div className="bg-blue-50 dark:bg-blue-950 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
        <Upload className="w-5 h-5" />
        Migration des données sauvegardées
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Vos {backupData.blocks.length} blocks sont prêts à être restaurés dans la base de données.
      </p>
      <Button
        onClick={importData}
        disabled={importing || status === 'success'}
        size="lg"
        className="w-full"
        variant={status === 'error' ? 'destructive' : 'default'}
      >
        {getButtonContent()}
      </Button>
    </div>
  );
}