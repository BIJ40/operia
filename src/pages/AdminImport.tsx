import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { importBackupData } from '@/lib/import-backup';
import { useState } from 'react';

export default function AdminImport() {
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    setImporting(true);
    await importBackupData();
    setImporting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <div className="bg-card border-2 rounded-lg p-8 shadow-xl">
          <h1 className="text-3xl font-bold mb-4 text-center">
            Import des données Apogée
          </h1>
          <p className="text-muted-foreground mb-8 text-center">
            Cliquez sur le bouton ci-dessous pour importer toutes les données depuis apogee-data.json
          </p>
          <Button
            onClick={handleImport}
            disabled={importing}
            variant="default"
            size="lg"
            className="w-full"
          >
            <Upload className="w-5 h-5 mr-2" />
            {importing ? 'IMPORT EN COURS...' : 'IMPORTER LES DONNÉES'}
          </Button>
        </div>
      </div>
    </div>
  );
}
