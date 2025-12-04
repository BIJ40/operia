/**
 * Page d'import des tickets depuis l'onglet DYSFONCTIONNEMENTS
 * Structure: Description | COMMENTAIRE APOGÉE
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Upload, FileSpreadsheet, ArrowLeft, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApogeeImportDysfonctionnements, parseDysfonctionnementsSheet, DysfonctionnementRow } from '../hooks/useApogeeImportDysfonctionnements';
import { ROUTES } from '@/config/routes';

export default function ApogeeTicketsImportDysfonctionnements() {
  const [parsedRows, setParsedRows] = useState<DysfonctionnementRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [sheetName, setSheetName] = useState<string>('');
  const navigate = useNavigate();
  
  const { importRows, isImporting, progress, result, errors } = useApogeeImportDysfonctionnements();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    
    setFileName(file.name);
    setParseError(null);
    
    try {
      const { rows, headers: detectedHeaders, sheetName: sheet } = await parseDysfonctionnementsSheet(file);
      setParsedRows(rows);
      setHeaders(detectedHeaders);
      setSheetName(sheet);
    } catch (error: any) {
      setParseError(error.message);
      setParsedRows([]);
      setHeaders([]);
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

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild aria-label="Retour">
          <Link to={ROUTES.projects.kanban}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Import Dysfonctionnements</h1>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Structure attendue : 2 colonnes - <strong>Description</strong> (col. 1) et <strong>COMMENTAIRE APOGÉE</strong> (col. 2).
          Les tickets seront importés en statut <strong>BACKLOG</strong> avec le tag <Badge variant="outline" className="ml-1">BUG</Badge>.
        </AlertDescription>
      </Alert>

      {/* Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Fichier Excel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-primary">Déposez le fichier ici...</p>
            ) : (
              <div>
                <p className="font-medium">Glissez-déposez un fichier Excel ici</p>
                <p className="text-sm text-muted-foreground mt-1">
                  ou cliquez pour sélectionner un fichier .xlsx
                </p>
              </div>
            )}
          </div>

          {/* Parse Error */}
          {parseError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          )}

          {/* Headers detected */}
          {headers.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">En-têtes détectés :</p>
              <div className="flex flex-wrap gap-2">
                {headers.map((h, i) => (
                  <Badge key={i} variant="secondary">{h || `(col. ${i + 1})`}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Parsed rows summary */}
          {parsedRows.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{fileName}</p>
                  <p className="text-sm text-muted-foreground">
                    Onglet : {sheetName} • {parsedRows.length} ligne(s) à importer
                  </p>
                </div>
                <Button onClick={handleImport} disabled={isImporting}>
                  {isImporting ? 'Import en cours...' : `Importer ${parsedRows.length} tickets`}
                </Button>
              </div>

              {/* Progress */}
              {isImporting && (
                <div className="space-y-2">
                  <Progress value={progress} />
                  <p className="text-sm text-muted-foreground text-center">{progress}%</p>
                </div>
              )}

              {/* Result */}
              {result && !isImporting && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Import terminé : {result.created} créé(s), {result.updated} mis à jour.
                    {errors.length > 0 && (
                      <span className="text-orange-600"> ({errors.length} erreur(s))</span>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Errors */}
              {errors.length > 0 && (
                <div className="max-h-32 overflow-y-auto text-sm text-destructive space-y-1">
                  {errors.map((err, i) => (
                    <p key={i}>{err}</p>
                  ))}
                </div>
              )}

              {/* Preview Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Ligne</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Commentaire Apogée</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.slice(0, 15).map((row) => (
                      <TableRow key={row.rowIndex}>
                        <TableCell className="font-mono text-xs">{row.rowIndex}</TableCell>
                        <TableCell className="max-w-md truncate" title={row.description}>
                          {row.description.substring(0, 100)}
                          {row.description.length > 100 && '...'}
                        </TableCell>
                        <TableCell className="max-w-sm truncate text-muted-foreground" title={row.commentaireApogee || ''}>
                          {row.commentaireApogee?.substring(0, 80) || '-'}
                          {(row.commentaireApogee?.length || 0) > 80 && '...'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {parsedRows.length > 15 && (
                  <div className="p-2 text-center text-sm text-muted-foreground bg-muted/50">
                    ... et {parsedRows.length - 15} autres lignes
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Back button after success */}
      {result && !isImporting && (
        <div className="flex justify-center">
          <Button onClick={() => navigate(ROUTES.projects.kanban)}>
            Retour au Kanban
          </Button>
        </div>
      )}
    </div>
  );
}
