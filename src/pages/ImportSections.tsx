import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { importSections } from '@/lib/import-sections';
import { toast } from 'sonner';
import { Loader2, Upload } from 'lucide-react';

export default function ImportSections() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleImport = async () => {
    setIsLoading(true);
    setResults(null);
    
    try {
      const categoryId = 'cat-5'; // Application Technicien
      const data = await importSections(categoryId);
      
      setResults(data);
      toast.success(data.message);
      
      // Recharger la page après 2 secondes pour voir les nouvelles sections
      setTimeout(() => {
        window.location.href = '/apogee/category/application-technicien';
      }, 2000);
    } catch (error: any) {
      toast.error('Erreur lors de l\'importation: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Import des sections Application Technicien</CardTitle>
            <CardDescription>
              Cliquez sur le bouton ci-dessous pour importer les 16 sections du manuel Application Technicien.
              Cette opération va supprimer les sections existantes de cette catégorie et les remplacer par les nouvelles.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button
              onClick={handleImport}
              disabled={isLoading}
              size="lg"
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Import en cours...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-5 w-5" />
                  Importer les 16 sections
                </>
              )}
            </Button>

            {results && (
              <div className="mt-6 space-y-4">
                <h3 className="text-lg font-semibold">Résultats de l'import :</h3>
                <div className="space-y-2">
                  {results.results?.map((result: any, index: number) => (
                    <div
                      key={index}
                      className={`p-3 rounded-md ${
                        result.success
                          ? 'bg-green-50 text-green-900 border border-green-200'
                          : 'bg-red-50 text-red-900 border border-red-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{result.title}</span>
                        <span className="text-sm">
                          {result.success ? '✓ Créée' : '✗ Erreur'}
                        </span>
                      </div>
                      {result.error && (
                        <p className="text-sm mt-1 opacity-80">{result.error}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
