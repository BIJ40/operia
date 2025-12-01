import { useState } from 'react';
import { useEditor } from '@/contexts/EditorContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Upload } from 'lucide-react';

export default function ImportSections() {
  const [jsonData, setJsonData] = useState('');
  const { importData } = useEditor();
  const { toast } = useToast();

  const handleImport = async () => {
    try {
      await importData(jsonData);
      toast({
        title: 'Succès',
        description: 'Les sections ont été importées avec succès.',
      });
      setJsonData('');
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'importer les données. Vérifiez le format JSON.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Importer des sections</h1>
      <div className="space-y-4">
        <Textarea
          value={jsonData}
          onChange={(e) => setJsonData(e.target.value)}
          placeholder="Collez ici le JSON des sections à importer..."
          rows={20}
          className="font-mono text-sm"
        />
        <Button onClick={handleImport} className="w-full">
          <Upload className="w-4 h-4 mr-2" />
          Importer
        </Button>
      </div>
    </div>
  );
}
