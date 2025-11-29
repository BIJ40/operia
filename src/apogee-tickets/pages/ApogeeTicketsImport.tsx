/**
 * Page d'import XLSX des tickets Apogée
 */

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApogeeImport, parseXlsxFile, type SheetDebugInfo } from '../hooks/useApogeeImport';
import type { ImportedRow } from '../types';
import { ROUTES } from '@/config/routes';

export default function ApogeeTicketsImport() {
  const [parsedRows, setParsedRows] = useState<ImportedRow[]>([]);
  const [debugInfo, setDebugInfo] = useState<SheetDebugInfo[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const { importRows, isImporting, progress, result, errors } = useApogeeImport();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFileName(file.name);
    setParseError(null);
    setParsedRows([]);
    setDebugInfo([]);

    try {
      const parseResult = await parseXlsxFile(file);
      setParsedRows(parseResult.rows);
      setDebugInfo(parseResult.debug);
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

  // Grouper les lignes par feuille pour l'aperçu
  const rowsBySheet = parsedRows.reduce((acc, row) => {
    if (!acc[row.sheetName]) acc[row.sheetName] = [];
    acc[row.sheetName].push(row);
    return acc;
  }, {} as Record<string, ImportedRow[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to={ROUTES.admin.apogeeTickets}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au Kanban
          </Button>
        </Link>
      </div>

      {/* Zone de drop */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importer un fichier Excel
          </CardTitle>
          <CardDescription>
            Importez votre fichier de suivi Apogée (XLSX). Les feuilles reconnues seront analysées automatiquement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
            `}
          >
            <input {...getInputProps()} />
            <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-primary font-medium">Déposez le fichier ici...</p>
            ) : (
              <>
                <p className="font-medium">Glissez-déposez un fichier XLSX</p>
                <p className="text-sm text-muted-foreground mt-1">
                  ou cliquez pour sélectionner
                </p>
              </>
            )}
          </div>

          {parseError && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Aperçu des données */}
      {parsedRows.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Aperçu de l'import</CardTitle>
                <CardDescription>
                  {fileName} - {parsedRows.length} ligne(s) détectée(s)
                </CardDescription>
              </div>
              <Button onClick={handleImport} disabled={isImporting}>
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Import en cours...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Lancer l'import
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isImporting && (
              <div className="mb-4 space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-center text-muted-foreground">{progress}%</p>
              </div>
            )}

            {/* Résumé par feuille */}
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(rowsBySheet).map(([sheetName, rows]) => (
                <Badge key={sheetName} variant="secondary">
                  {sheetName}: {rows.length} ligne(s)
                </Badge>
              ))}
            </div>

            {/* Liste des lignes */}
            <ScrollArea className="h-[300px] border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="p-2 text-left font-medium">Feuille</th>
                    <th className="p-2 text-left font-medium">Ligne</th>
                    <th className="p-2 text-left font-medium">Élément</th>
                    <th className="p-2 text-left font-medium">Prio</th>
                    <th className="p-2 text-left font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 100).map((row, idx) => (
                    <tr key={idx} className="border-t hover:bg-muted/50">
                      <td className="p-2 font-mono text-xs">{row.sheetName}</td>
                      <td className="p-2">{row.rowIndex}</td>
                      <td className="p-2 max-w-[200px] truncate">
                        {String(row.data['ELEMENTS CONCERNES'] || row.data['DESCRIPTIF'] || '-')}
                      </td>
                      <td className="p-2">{row.data['PRIO'] || '-'}</td>
                      <td className="p-2">{row.data['ACTION'] || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedRows.length > 100 && (
                <p className="p-2 text-center text-sm text-muted-foreground">
                  ... et {parsedRows.length - 100} autre(s) ligne(s)
                </p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Résultat de l'import */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              Import terminé
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Badge variant="default" className="bg-green-500">
                {result.created} créé(s)
              </Badge>
              <Badge variant="secondary">
                {result.updated} mis à jour
              </Badge>
              {result.errors.length > 0 && (
                <Badge variant="destructive">
                  {result.errors.length} erreur(s)
                </Badge>
              )}
            </div>

            {errors.length > 0 && (
              <ScrollArea className="h-[150px] border rounded p-2">
                {errors.map((err, idx) => (
                  <p key={idx} className="text-sm text-destructive">{err}</p>
                ))}
              </ScrollArea>
            )}

            <Link to={ROUTES.admin.apogeeTickets}>
              <Button>Voir le Kanban</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
