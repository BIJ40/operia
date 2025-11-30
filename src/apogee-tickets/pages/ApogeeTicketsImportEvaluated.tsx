/**
 * Page d'import pour les onglets:
 * - LISTE EVALUEE A PRIORISER
 * - RESTE A EVALUER EN H
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
import { useApogeeImportEvaluated, parseEvaluatedSheet, EvaluatedRow } from '../hooks/useApogeeImportEvaluated';
import { HeatPriorityBadge } from '../components/HeatPriorityBadge';
import { ROUTES } from '@/config/routes';

const KANBAN_ROUTE = ROUTES.projects.kanban;

export default function ApogeeTicketsImportEvaluated() {
  const navigate = useNavigate();
  const [parsedRows, setParsedRows] = useState<EvaluatedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [sheetName, setSheetName] = useState<string>('');
  const [parseError, setParseError] = useState<string | null>(null);
  
  const { importRows, isImporting, progress, result, errors } = useApogeeImportEvaluated();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    
    setParseError(null);
    try {
      const { rows, headers, sheetName } = await parseEvaluatedSheet(file);
      setParsedRows(rows);
      setHeaders(headers);
      setSheetName(sheetName);
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

  // Mapper les prio vers heat_priority pour l'affichage
  const getHeatPriorityFromPrio = (prio: string | null, sheet: string) => {
    const isEvaluated = sheet.includes('EVALUEE');
    if (!prio) return isEvaluated ? 4 : 2;
    switch (prio.toUpperCase()) {
      case 'A': return isEvaluated ? 7 : 5;
      case 'B': return isEvaluated ? 5 : 4;
      case 'C': return isEvaluated ? 3 : 2;
      case 'NON': return 1;
      default: return isEvaluated ? 4 : 2;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(KANBAN_ROUTE)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Import Liste Évaluée</h1>
          <p className="text-muted-foreground">Onglets "LISTE EVALUEE A PRIORISER" et "RESTE A EVALUER EN H"</p>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Structure attendue:</strong> ELEMENTS CONCERNES | PRIO (A/B/C/NON/-) | H Min | H Max | % Pris en charge Dynoco | CODE HCA | DESCRIPTIF | IMAGE | APOGEE | COMMENTAIRE APOGÉE | HC | COMMENTAIRE florian | COMMENTAIRE Jérome
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
                  <Badge variant="secondary">{sheetName}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {parsedRows.length} lignes détectées
                  </span>
                  <HeatPriorityBadge priority={getHeatPriorityFromPrio('A', sheetName)} />
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
                        <TableHead>Élément</TableHead>
                        <TableHead className="w-16">Prio</TableHead>
                        <TableHead className="w-20">H Min</TableHead>
                        <TableHead className="w-20">H Max</TableHead>
                        <TableHead className="w-24">% Dynoco</TableHead>
                        <TableHead>Descriptif</TableHead>
                        <TableHead className="w-24">Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedRows.slice(0, 15).map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-xs">{row.rowIndex}</TableCell>
                          <TableCell className="max-w-[150px] truncate" title={row.elementConcerne || ''}>
                            {row.elementConcerne || '-'}
                          </TableCell>
                          <TableCell>
                            {row.prio && (
                              <Badge 
                                variant={row.prio === 'A' ? 'destructive' : row.prio === 'B' ? 'default' : 'secondary'}
                              >
                                {row.prio}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{row.hMin || '-'}</TableCell>
                          <TableCell>{row.hMax || '-'}</TableCell>
                          <TableCell>{row.priseEnChargeDynoco || '-'}</TableCell>
                          <TableCell className="max-w-[200px] truncate" title={row.descriptif || ''}>
                            {row.descriptif?.substring(0, 50) || '-'}
                          </TableCell>
                          <TableCell>
                            {row.apogeeStatus && (
                              <Badge variant="outline" className="text-xs">
                                {row.apogeeStatus}
                              </Badge>
                            )}
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
