import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Upload } from 'lucide-react';
import { useRef } from 'react';

interface CompleteBackupCardProps {
  onExport: () => void;
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isExporting: boolean;
  isImporting: boolean;
}

export function CompleteBackupCard({ onExport, onImport, isExporting, isImporting }: CompleteBackupCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exporter toutes les données
          </CardTitle>
          <CardDescription>Sauvegarde complète (format technique)</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onExport} disabled={isExporting} className="w-full" size="lg">
            {isExporting ? 'Export en cours...' : 'Télécharger la sauvegarde'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Restaurer les données
          </CardTitle>
          <CardDescription>Importer un fichier de sauvegarde complète</CardDescription>
        </CardHeader>
        <CardContent>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={onImport}
            className="hidden"
            id="import-file"
          />
          <Button
            disabled={isImporting}
            className="w-full"
            size="lg"
            onClick={() => fileInputRef.current?.click()}
          >
            {isImporting ? 'Import en cours...' : 'Choisir un fichier'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
