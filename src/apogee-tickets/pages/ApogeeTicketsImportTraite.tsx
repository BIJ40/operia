/**
 * Page d'import pour les tickets TRAITE
 * Les tickets importés sont directement intégrés en statut DONE (EN_PROD)
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Upload, FileSpreadsheet, Info, CheckCircle } from 'lucide-react';
import { useApogeeImportTraite, parseTraiteSheet, type TraiteRow } from '../hooks/useApogeeImportTraite';
import { ROUTES } from '@/config/routes';

const KANBAN_ROUTE = ROUTES.projects.kanban;

export default function ApogeeTicketsImportTraite() {
  const navigate = useNavigate();
  const [parsedRows, setParsedRows] = useState<TraiteRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  
  const { importRows, isImporting, progress, result, errors } = useApogeeImportTraite();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    
    setParseError(null);
    try {
      const { rows, headers: h } = await parseTraiteSheet(file);
      setParsedRows(rows);
      setHeaders(h);
      if (rows.length === 0) {
        setParseError('Aucune ligne valide trouvée dans le fichier');
      }
    } catch (error: any) {
      setParseError(error.message || 'Erreur lors de la lecture du fichier');
      setParsedRows([]);
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
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(KANBAN_ROUTE)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Import Tickets Traités</h1>
          <p className="text-muted-foreground">Import de tickets déjà traités - intégration directe en statut DONE</p>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-semibold">Structure attendue :</p>
            <p className="text-sm">
              <strong>origine</strong> | <strong>module</strong> (ou "modue") | <strong>objet</strong> | <strong>description</strong> | <strong>commentaires</strong> | <strong>commentaires / échanges</strong>
            </p>
            <p className="text-sm mt-2 text-amber-600 font-medium">
              ⚠️ Les tickets importés seront automatiquement en statut <Badge variant="outline" className="bg-green-50 text-green-700">EN_PROD (DONE)</Badge> et marqués comme qualifiés.
            </p>
          </div>
        </AlertDescription>
      </Alert>

      {/* Zone d'upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Fichier Excel
          </CardTitle>
          <CardDescription>
            Glissez un fichier .xlsx ou cliquez pour sélectionner
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p>Déposez le fichier ici...</p>
            ) : (
              <p>Glissez-déposez un fichier Excel ici, ou cliquez pour sélectionner</p>
            )}
          </div>

          {parseError && (
            <Alert variant="destructive">
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          )}

          {parsedRows.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge variant="secondary">Fichier TRAITE</Badge>
                  <span className="text-sm text-muted-foreground">
                    {parsedRows.length} lignes détectées
                  </span>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Statut: EN_PROD (DONE)
                  </Badge>
                </div>
                <Button onClick={handleImport} disabled={isImporting}>
                  {isImporting ? 'Import en cours...' : 'Importer'}
                </Button>
              </div>

              {isImporting && (
                <div className="space-y-2">
                  <Progress value={progress} />
                  <p className="text-sm text-muted-foreground text-center">{progress}%</p>
                </div>
              )}

              {result && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Import terminé: {result.created} créés, {result.updated} mis à jour
                  </AlertDescription>
                </Alert>
              )}

              {errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertDescription>
                    <div className="max-h-32 overflow-y-auto">
                      {errors.map((err, i) => (
                        <div key={i}>{err}</div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Aperçu des données */}
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-[400px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Origine</TableHead>
                        <TableHead>Module</TableHead>
                        <TableHead>Objet</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Commentaires</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedRows.slice(0, 15).map((row) => (
                        <TableRow key={row.rowIndex}>
                          <TableCell className="font-mono text-xs">{row.rowIndex}</TableCell>
                          <TableCell className="max-w-[150px] truncate" title={row.origine || ''}>
                            {row.origine || '-'}
                          </TableCell>
                          <TableCell className="max-w-[100px] truncate" title={row.module || ''}>
                            {row.module || '-'}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate" title={row.objet || ''}>
                            {row.objet || '-'}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate" title={row.description || ''}>
                            {row.description?.substring(0, 50) || '-'}
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate">
                            {row.commentaires || row.commentairesEchanges || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {parsedRows.length > 15 && (
                  <div className="p-2 text-center text-sm text-muted-foreground border-t">
                    + {parsedRows.length - 15} lignes supplémentaires
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
