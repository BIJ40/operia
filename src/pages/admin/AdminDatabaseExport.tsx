import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Loader2, RefreshCw, DatabaseIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TableInfo {
  name: string;
  count: number;
}

export default function AdminDatabaseExport() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0, tableName: '' });

  const getToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  };

  const callExport = async (table?: string) => {
    const token = await getToken();
    if (!token) throw new Error('Non authentifié');
    const baseUrl = import.meta.env.VITE_SUPABASE_URL;
    const url = table
      ? `${baseUrl}/functions/v1/export-all-data?table=${encodeURIComponent(table)}`
      : `${baseUrl}/functions/v1/export-all-data`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || `Erreur ${res.status}`);
    }
    return res.json();
  };

  const loadTables = useCallback(async () => {
    setLoading(true);
    try {
      const data = await callExport();
      setTables(data.tables ?? []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const downloadJson = (data: unknown, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportSingleTable = async (tableName: string) => {
    try {
      toast.info(`Export de ${tableName}...`);
      const result = await callExport(tableName);
      downloadJson(result.data, `${tableName}-${new Date().toISOString().split('T')[0]}.json`);
      toast.success(`${tableName} : ${result.count} lignes exportées`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const exportAll = async () => {
    const nonEmpty = tables.filter(t => t.count > 0);
    if (nonEmpty.length === 0) {
      toast.warning('Aucune table à exporter');
      return;
    }
    setExporting(true);
    setExportProgress({ current: 0, total: nonEmpty.length, tableName: '' });

    const consolidated: Record<string, unknown[]> = {};
    let errors = 0;

    for (let i = 0; i < nonEmpty.length; i++) {
      const t = nonEmpty[i];
      setExportProgress({ current: i + 1, total: nonEmpty.length, tableName: t.name });
      try {
        const result = await callExport(t.name);
        consolidated[t.name] = result.data;
      } catch {
        errors++;
        consolidated[t.name] = [];
      }
    }

    downloadJson(consolidated, `database-full-export-${new Date().toISOString().split('T')[0]}.json`);
    setExporting(false);
    toast.success(`Export terminé (${nonEmpty.length - errors}/${nonEmpty.length} tables)${errors ? `, ${errors} erreurs` : ''}`);
  };

  const totalRows = tables.reduce((s, t) => s + Math.max(t.count, 0), 0);
  const progressPct = exportProgress.total > 0 ? (exportProgress.current / exportProgress.total) * 100 : 0;

  return (
    <div className="space-y-6 p-1">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <DatabaseIcon className="h-5 w-5" />
              Export complet de la base de données
            </CardTitle>
            <CardDescription>
              {tables.length > 0
                ? `${tables.length} tables · ${totalRows.toLocaleString()} lignes au total`
                : 'Chargez la liste des tables pour commencer'}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadTables} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {tables.length === 0 ? 'Charger' : 'Rafraîchir'}
            </Button>
            {tables.length > 0 && (
              <Button size="sm" onClick={exportAll} disabled={exporting}>
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Tout exporter
              </Button>
            )}
          </div>
        </CardHeader>

        {exporting && (
          <CardContent className="pt-0 pb-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Export : {exportProgress.tableName}</span>
                <span>{exportProgress.current}/{exportProgress.total}</span>
              </div>
              <Progress value={progressPct} className="h-2" />
            </div>
          </CardContent>
        )}

        {tables.length > 0 && (
          <CardContent className="pt-0">
            <div className="rounded-md border max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead className="text-right w-28">Lignes</TableHead>
                    <TableHead className="text-right w-28">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tables.map((t, i) => (
                    <TableRow key={t.name}>
                      <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                      <TableCell className="font-mono text-xs">{t.name}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {t.count >= 0 ? t.count.toLocaleString() : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={t.count <= 0 || exporting}
                          onClick={() => exportSingleTable(t.name)}
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
