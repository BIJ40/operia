/**
 * Page d'import pour les onglets Priorités A et Priorités B
 * Ces imports doivent être effectués EN PREMIER pour que ces tickets
 * aient la priorité thermique (heat_priority) la plus élevée.
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, ArrowLeft, Flame } from 'lucide-react';
import { useApogeeImportPriorities, PriorityRow } from '../hooks/useApogeeImportPriorities';
import { ROUTES } from '@/config/routes';

export default function ApogeeTicketsImportPriorities() {
  const navigate = useNavigate();
  const { parsePrioritySheet, importRows, isImporting, progress, result, errors } = useApogeeImportPriorities();
  
  const [parsedRows, setParsedRows] = useState<PriorityRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [sheetName, setSheetName] = useState<string>('');
  const [parseError, setParseError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setParseError(null);
    try {
      const { rows, headers: h, sheetName: sheet } = await parsePrioritySheet(file);
      setParsedRows(rows);
      setHeaders(h);
      setSheetName(sheet);
    } catch (error: any) {
      setParseError(error.message || 'Erreur lors de la lecture du fichier');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
  });

  const handleImport = () => {
    if (parsedRows.length > 0) {
      importRows(parsedRows);
    }
  };

  const isA = sheetName.includes('A');

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(ROUTES.projects.kanban)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour au Kanban
        </Button>
        <h1 className="text-2xl font-bold">Import Priorités A / B</h1>
      </div>

      <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
        <Flame className="h-4 w-4 text-orange-500" />
        <AlertTitle className="text-orange-700 dark:text-orange-400">Import prioritaire</AlertTitle>
        <AlertDescription className="text-orange-600 dark:text-orange-300">
          <strong>IMPORTANT:</strong> Les onglets Priorités A et B doivent être importés EN PREMIER.
          <br />
          • <strong>Priorité A</strong> → heat_priority 8-10 (haute priorité thermique)
          <br />
          • <strong>Priorité B</strong> → heat_priority 5-7 (priorité moyenne)
          <br />
          Les imports ultérieurs (V1, général) ignoreront les tickets déjà présents.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Fichier Excel - Onglet Priorités A ou B
          </CardTitle>
          <CardDescription>
            Colonnes attendues: ELEMENTS CONCERNES | PRIO | ACTION | Temps mini | Temps maxi | PRISE EN CHARGE | HCA | DESCRIPTIF | APOGEE | COMMENTAIRE APOGÉE | HC | COMMENTAIRE florian
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p>Déposez le fichier ici...</p>
            ) : (
              <p>Glissez-déposez un fichier Excel, ou cliquez pour sélectionner</p>
            )}
          </div>

          {parseError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          )}

          {parsedRows.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={isA ? 'destructive' : 'secondary'} className="text-sm">
                    {sheetName.replace('_', ' ')}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {parsedRows.length} lignes détectées
                  </span>
                  <Badge variant="outline" className="text-xs">
                    <Flame className="h-3 w-3 mr-1" />
                    Heat: {isA ? '8-10' : '5-7'}
                  </Badge>
                </div>
                <Button onClick={handleImport} disabled={isImporting}>
                  {isImporting ? 'Import en cours...' : 'Lancer l\'import'}
                </Button>
              </div>

              {isImporting && (
                <div className="space-y-2">
                  <Progress value={progress} />
                  <p className="text-sm text-center text-muted-foreground">{progress}%</p>
                </div>
              )}

              {result && (
                <Alert className={result.errors.length > 0 ? 'border-yellow-500' : 'border-green-500'}>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Import terminé</AlertTitle>
                  <AlertDescription>
                    {result.created} tickets créés, {result.updated} mis à jour
                    {result.errors.length > 0 && ` (${result.errors.length} erreurs)`}
                  </AlertDescription>
                </Alert>
              )}

              {errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Erreurs ({errors.length})</AlertTitle>
                  <AlertDescription>
                    <ScrollArea className="h-32">
                      <ul className="list-disc list-inside">
                        {errors.slice(0, 10).map((err, i) => (
                          <li key={i} className="text-xs">{err}</li>
                        ))}
                        {errors.length > 10 && <li className="text-xs">... et {errors.length - 10} autres</li>}
                      </ul>
                    </ScrollArea>
                  </AlertDescription>
                </Alert>
              )}

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Aperçu des données (10 premières lignes)</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-64">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Élément concerné</TableHead>
                          <TableHead className="w-24">Action</TableHead>
                          <TableHead className="w-20">Heat</TableHead>
                          <TableHead>Descriptif</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedRows.slice(0, 10).map((row, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-xs text-muted-foreground">{row.rowIndex}</TableCell>
                            <TableCell className="max-w-[200px] truncate text-sm">
                              {row.elementConcerne || '-'}
                            </TableCell>
                            <TableCell className="text-xs">{row.action || '-'}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                <Flame className="h-3 w-3 mr-1 text-orange-500" />
                                {isA ? '9' : '6'}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[300px] truncate text-xs text-muted-foreground">
                              {row.descriptif || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
