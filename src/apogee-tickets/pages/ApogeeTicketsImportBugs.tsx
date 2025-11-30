import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileSpreadsheet, ArrowLeft, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApogeeImportBugs, parseBugsSheet, BugsRow } from '../hooks/useApogeeImportBugs';
import { ROUTES } from '@/config/routes';
export default function ApogeeTicketsImportBugs() {
  const [parsedRows, setParsedRows] = useState<BugsRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  
  const { importRows, isImporting, progress, result, errors } = useApogeeImportBugs();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    
    setFileName(file.name);
    setParseError(null);
    
    try {
      const { rows, headers: h } = await parseBugsSheet(file);
      setParsedRows(rows);
      setHeaders(h);
    } catch (err: any) {
      setParseError(err.message || 'Erreur de parsing');
      setParsedRows([]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFiles: 1,
  });

  const handleImport = () => {
    if (parsedRows.length > 0) {
      importRows(parsedRows);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to={ROUTES.projects.kanban}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au Kanban
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Import Onglet BUGS</h1>
      </div>

      {/* Zone d'upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Fichier Excel (onglet BUGS)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-primary">Déposez le fichier ici...</p>
            ) : (
              <div>
                <p className="font-medium">Glissez-déposez votre fichier Excel ici</p>
                <p className="text-sm text-muted-foreground mt-1">ou cliquez pour sélectionner</p>
              </div>
            )}
          </div>
          
          {parseError && (
            <p className="text-destructive mt-4">{parseError}</p>
          )}
        </CardContent>
      </Card>

      {/* Debug: colonnes détectées */}
      {headers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Colonnes détectées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {headers.map((h, i) => (
                <Badge key={i} variant="secondary">{h || `(vide ${i})`}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prévisualisation */}
      {parsedRows.length > 0 && !result && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              Prévisualisation: {parsedRows.length} lignes
            </CardTitle>
            <Button onClick={handleImport} disabled={isImporting}>
              {isImporting ? 'Import en cours...' : `Importer ${parsedRows.length} tickets`}
            </Button>
          </CardHeader>
          <CardContent>
            {isImporting && (
              <div className="mb-4">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-muted-foreground mt-1">{progress}%</p>
              </div>
            )}
            
            <div className="border rounded-lg overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Ligne</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead className="min-w-[300px]">Description</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Commentaire</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.slice(0, 50).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{row.rowIndex}</TableCell>
                      <TableCell className="text-sm">{row.user || '-'}</TableCell>
                      <TableCell>
                        {row.module && <Badge variant="outline">{row.module}</Badge>}
                      </TableCell>
                      <TableCell className="text-sm max-w-[400px] truncate">
                        {row.description.substring(0, 100)}...
                      </TableCell>
                      <TableCell>
                        {row.statut && (
                          <Badge variant={
                            row.statut.includes('OK') ? 'default' :
                            row.statut.includes('ATT') ? 'secondary' : 'outline'
                          }>
                            {row.statut}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {row.commentaireApogee?.substring(0, 50) || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {parsedRows.length > 50 && (
              <p className="text-sm text-muted-foreground mt-2">
                Affichage limité aux 50 premières lignes...
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Résultat */}
      {result && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              Import terminé
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Badge variant="default" className="bg-green-600">{result.created} créés</Badge>
              <Badge variant="secondary">{result.updated} mis à jour</Badge>
              {errors.length > 0 && (
                <Badge variant="destructive">{errors.length} erreurs</Badge>
              )}
            </div>
            
            {errors.length > 0 && (
              <div className="mt-4 p-3 bg-destructive/10 rounded text-sm">
                <p className="font-medium text-destructive mb-2">Erreurs:</p>
                <ul className="list-disc list-inside space-y-1">
                  {errors.slice(0, 10).map((err, i) => (
                    <li key={i} className="text-destructive">{err}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <Button asChild className="mt-4">
              <Link to={ROUTES.projects.kanban}>Voir le Kanban</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
