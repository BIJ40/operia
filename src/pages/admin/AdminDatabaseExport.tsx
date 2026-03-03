import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Loader2, RefreshCw, DatabaseIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type ExportFormat = 'json' | 'sql';

interface TableInfo {
  name: string;
  count: number;
}

const escapeSQL = (val: unknown): string => {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  return `'${String(val).replace(/'/g, "''")}'`;
};

const rowsToSQL = (tableName: string, rows: Record<string, unknown>[]): string => {
  if (!rows.length) return `-- Table ${tableName}: empty\n`;
  const cols = Object.keys(rows[0]);
  const colList = cols.map(c => `"${c}"`).join(', ');
  const lines = rows.map(row => {
    const vals = cols.map(c => escapeSQL(row[c])).join(', ');
    return `INSERT INTO public."${tableName}" (${colList}) VALUES (${vals});`;
  });
  return `-- Table: ${tableName} (${rows.length} rows)\n${lines.join('\n')}\n`;
};

export default function AdminDatabaseExport() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0, tableName: '' });

  const getToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  };

  const apiFetch = async (params: string = '') => {
    const token = await getToken();
    if (!token) throw new Error('Non authentifié');
    const baseUrl = import.meta.env.VITE_SUPABASE_URL;
    const url = `${baseUrl}/functions/v1/export-all-data${params ? '?' + params : ''}`;
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
      // Step 1: Get table names (fast)
      const listData = await apiFetch();
      const tableNames: string[] = (listData.tables ?? []).map((t: any) => t.name);
      
      // Initialize with count = -1 (loading)
      const initial = tableNames.map(name => ({ name, count: -1 }));
      setTables(initial);

      // Step 2: Fetch counts in batches of 15
      const BATCH = 15;
      const updated = [...initial];
      for (let i = 0; i < tableNames.length; i += BATCH) {
        const batch = tableNames.slice(i, i + BATCH);
        try {
          const countData = await apiFetch(`countOnly=${batch.join(',')}`);
          for (const t of countData.tables ?? []) {
            const idx = updated.findIndex(u => u.name === t.name);
            if (idx !== -1) updated[idx] = { ...updated[idx], count: t.count };
          }
          setTables([...updated]);
        } catch {
          // Leave as -1
        }
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const downloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const fetchAllPages = async (tableName: string): Promise<Record<string, unknown>[]> => {
    let allRows: Record<string, unknown>[] = [];
    let page = 0;
    const HEAVY = ['blocks', 'apporteur_blocks', 'guide_chunks', 'chatbot_queries', 'operia_blocks', 'rag_index_documents'];
    const pageSize = HEAVY.includes(tableName) ? 25 : 100;
    let hasMore = true;
    while (hasMore) {
      const result = await apiFetch(`table=${encodeURIComponent(tableName)}&page=${page}&pageSize=${pageSize}`);
      allRows = allRows.concat(result.data);
      hasMore = Boolean(result.hasMore ?? (result.count === pageSize));
      page++;
    }
    return allRows;
  };

  const exportSingleTable = async (tableName: string) => {
    try {
      toast.info(`Export de ${tableName}...`);
      const rows = await fetchAllPages(tableName);
      const date = new Date().toISOString().split('T')[0];
      if (exportFormat === 'sql') {
        downloadFile(rowsToSQL(tableName, rows), `${tableName}-${date}.sql`, 'text/sql');
      } else {
        downloadFile(JSON.stringify(rows, null, 2), `${tableName}-${date}.json`, 'application/json');
      }
      toast.success(`${tableName} : ${rows.length} lignes exportées (${exportFormat.toUpperCase()})`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const exportAll = async () => {
    const allTables = tables.filter(t => t.count >= 0);
    if (allTables.length === 0) {
      toast.warning('Aucune table à exporter');
      return;
    }
    setExporting(true);
    setExportProgress({ current: 0, total: allTables.length, tableName: '' });

    const consolidated: Record<string, unknown[]> = {};
    let errors = 0;

    for (let i = 0; i < allTables.length; i++) {
      const t = allTables[i];
      setExportProgress({ current: i + 1, total: allTables.length, tableName: t.name });
      // Skip fetching for empty tables, just record empty array
      if (t.count === 0) {
        consolidated[t.name] = [];
        continue;
      }
      try {
        consolidated[t.name] = await fetchAllPages(t.name);
      } catch (err: any) {
        errors++;
        consolidated[t.name] = [];
        toast.error(`Échec export "${t.name}": ${err?.message || 'erreur inconnue'}`);
      }
    }

    const date = new Date().toISOString().split('T')[0];
    if (exportFormat === 'sql') {
      const sqlContent = Object.entries(consolidated)
        .map(([name, rows]) => rowsToSQL(name, rows as Record<string, unknown>[]))
        .join('\n');
      downloadFile(sqlContent, `database-full-export-${date}.sql`, 'text/sql');
    } else {
      downloadFile(JSON.stringify(consolidated, null, 2), `database-full-export-${date}.json`, 'application/json');
    }
    setExporting(false);
    toast.success(`Export terminé (${allTables.length - errors}/${allTables.length} tables)${errors ? `, ${errors} erreurs` : ''}`);
  };

  const totalRows = tables.reduce((s, t) => s + Math.max(t.count, 0), 0);
  const progressPct = exportProgress.total > 0 ? (exportProgress.current / exportProgress.total) * 100 : 0;
  const countsLoaded = tables.length > 0 && tables.every(t => t.count !== -1);

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
                ? `${tables.length} tables${countsLoaded ? ` · ${totalRows.toLocaleString()} lignes au total` : ' · comptage en cours...'}`
                : 'Chargez la liste des tables pour commencer'}
            </CardDescription>
          </div>
          <div className="flex gap-2 items-center">
            <div className="flex rounded-md border border-border overflow-hidden mr-1">
              <button
                className={`px-2.5 py-1 text-xs font-medium transition-colors ${exportFormat === 'json' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
                onClick={() => setExportFormat('json')}
              >JSON</button>
              <button
                className={`px-2.5 py-1 text-xs font-medium transition-colors ${exportFormat === 'sql' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
                onClick={() => setExportFormat('sql')}
              >SQL</button>
            </div>
            <Button variant="outline" size="sm" onClick={loadTables} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {tables.length === 0 ? 'Charger' : 'Rafraîchir'}
            </Button>
            {tables.length > 0 && countsLoaded && (
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
                        {t.count === -1 ? (
                          <Loader2 className="h-3 w-3 animate-spin inline" />
                        ) : (
                          t.count.toLocaleString()
                        )}
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
