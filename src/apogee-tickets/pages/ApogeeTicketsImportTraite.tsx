import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useApogeeImportTraite, type TraiteRow } from '../hooks/useApogeeImportTraite';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const KANBAN_ROUTE = '/projects';

export default function ApogeeTicketsImportTraite() {
  const [parsedRows, setParsedRows] = useState<TraiteRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  const { parseTraiteSheet, importRows, isImporting, progress, result, errors } = useApogeeImportTraite();

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    try {
      setParseError(null);
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
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    multiple: false,
  });

  const handleImport = () => {
    if (parsedRows.length > 0) {
      importRows(parsedRows);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Import Tickets Traités</h1>
        <p className="text-muted-foreground">
          Importez des tickets déjà traités qui seront intégrés directement en statut DONE (EN_PROD).
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-semibold">Structure Excel attendue :</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><strong>origine</strong> : Source ou reporter du ticket</li>
              <li><strong>module</strong> (ou "modue") : Module concerné (RDV, DEVIS, DOSSIER, etc.)</li>
              <li><strong>objet</strong> : Titre du ticket</li>
              <li><strong>description</strong> : Description détaillée</li>
              <li><strong>commentaires</strong> : Commentaires principaux</li>
              <li><strong>commentaires / échanges</strong> : Commentaires additionnels</li>
            </ul>
            <p className="text-sm mt-2 text-amber-600 font-medium">
              ⚠️ Les tickets importés seront automatiquement en statut EN_PROD (DONE) et marqués comme qualifiés.
            </p>
          </div>
        </AlertDescription>
      </Alert>

      <Card className="border-l-4 border-l-helpconfort-blue bg-gradient-radial from-helpconfort-blue/10 via-white to-white">
        <div className="p-6 space-y-4">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-helpconfort-blue bg-helpconfort-blue/5'
                : 'border-gray-300 hover:border-helpconfort-blue'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-helpconfort-blue mb-4" />
            <p className="text-lg font-medium mb-2">
              {isDragActive
                ? 'Déposez le fichier ici...'
                : 'Glissez-déposez un fichier Excel ici'}
            </p>
            <p className="text-sm text-muted-foreground">
              ou cliquez pour sélectionner un fichier (.xlsx, .xls)
            </p>
          </div>

          {parseError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          )}

          {parsedRows.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-helpconfort-blue" />
                  <span className="font-medium">
                    Fichier TRAITÉ détecté - {parsedRows.length} ligne(s)
                  </span>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Statut: EN_PROD (DONE)
                  </Badge>
                </div>
                {!isImporting && !result && (
                  <Button
                    onClick={handleImport}
                    className="bg-helpconfort-blue hover:bg-helpconfort-blue/90"
                  >
                    Importer
                  </Button>
                )}
              </div>

              {isImporting && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Import en cours...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              {result && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    <p className="font-medium">Import terminé !</p>
                    <p className="text-sm mt-1">
                      {result.created} ticket(s) créé(s), {result.updated} mis à jour
                    </p>
                    {errors.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-red-600">Erreurs :</p>
                        <ul className="list-disc list-inside text-sm">
                          {errors.slice(0, 5).map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                          {errors.length > 5 && (
                            <li>... et {errors.length - 5} autre(s) erreur(s)</li>
                          )}
                        </ul>
                      </div>
                    )}
                    <Button
                      onClick={() => (window.location.href = KANBAN_ROUTE)}
                      className="mt-4 bg-helpconfort-blue hover:bg-helpconfort-blue/90"
                    >
                      Voir le Kanban
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              <div className="border rounded-lg">
                <div className="max-h-[400px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Ligne</TableHead>
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
                          <TableCell className="text-sm">{row.origine || '-'}</TableCell>
                          <TableCell className="text-sm">{row.module || '-'}</TableCell>
                          <TableCell className="text-sm max-w-xs truncate">
                            {row.objet || '-'}
                          </TableCell>
                          <TableCell className="text-sm max-w-xs truncate">
                            {row.description || '-'}
                          </TableCell>
                          <TableCell className="text-sm max-w-xs truncate">
                            {row.commentaires || row.commentairesEchanges || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {parsedRows.length > 15 && (
                  <div className="p-2 text-center text-sm text-muted-foreground border-t">
                    ... et {parsedRows.length - 15} autre(s) ligne(s)
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
