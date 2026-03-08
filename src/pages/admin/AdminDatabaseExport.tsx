import { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Loader2, RefreshCw, DatabaseIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { monitorEdgeCall } from '@/lib/edge-monitor';
import { toast } from 'sonner';

type ExportFormat = 'json' | 'sql';

interface TableInfo {
  name: string;
  count: number;
  maxPageSize: number;
}

const FULL_LADDER = [100, 50, 25, 10, 5, 3, 1];

/** Build a retry ladder starting at the table's maxPageSize */
function buildLadder(maxPageSize: number): number[] {
  return FULL_LADDER.filter(s => s <= maxPageSize);
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

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export default function AdminDatabaseExport() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0, tableName: '' });
  const cancelRef = useRef(false);

  const getToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  };

  const apiFetch = async (params: string = '') => {
    const token = await getToken();
    if (!token) throw new Error('Non authentifié');
    const baseUrl = import.meta.env.VITE_SUPABASE_URL;
    const url = `${baseUrl}/functions/v1/export-all-data${params ? '?' + params : ''}`;
    const res = await monitorEdgeCall('export-all-data', () =>
      fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const error = new Error(err?.error || `Erreur ${res.status}`) as any;
      error.status = res.status;
      throw error;
    }
    return res.json();
  };

  const loadTables = useCallback(async () => {
    setLoading(true);
    try {
      const listData = await apiFetch();
      const rawTables: { name: string; maxPageSize: number }[] = listData.tables ?? [];
      
      const initial: TableInfo[] = rawTables.map(t => ({ name: t.name, count: -1, maxPageSize: t.maxPageSize ?? 100 }));
      setTables(initial);

      // Fetch counts in batches of 15
      const BATCH = 15;
      const updated = [...initial];
      const tableNames = rawTables.map(t => t.name);
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

  /** Fetch all pages for a table with adaptive pageSize using the table's maxPageSize as ceiling */
  const fetchAllPages = async (tableName: string, maxPageSize: number): Promise<Record<string, unknown>[]> => {
    const ladder = buildLadder(maxPageSize);
    let allRows: Record<string, unknown>[] = [];
    let page = 0;
    let hasMore = true;
    let ladderIdx = 0;

    while (hasMore) {
      let success = false;
      
      while (ladderIdx < ladder.length && !success) {
        const pageSize = ladder[ladderIdx];
        try {
          const result = await apiFetch(`table=${encodeURIComponent(tableName)}&page=${page}&pageSize=${pageSize}`);
          allRows = allRows.concat(result.data ?? []);
          hasMore = Boolean(result.hasMore ?? ((result.count ?? 0) === (result.pageSize ?? pageSize)));
          success = true;
          page++;
        } catch (err: any) {
          if ((err.status === 546 || err.status === 500) && ladderIdx < ladder.length - 1) {
            ladderIdx++;
            console.warn(`[Export] ${tableName} page ${page}: ${err.status} → reducing pageSize to ${ladder[ladderIdx]}`);
          } else {
            throw err;
          }
        }
      }
      
      if (!success) {
        throw new Error(`WORKER_LIMIT: impossible d'exporter ${tableName} même avec pageSize=1`);
      }
    }
    return allRows;
  };

  const exportSingleTable = async (tableName: string) => {
    const tableInfo = tables.find(t => t.name === tableName);
    const maxPS = tableInfo?.maxPageSize ?? 100;
    try {
      toast.info(`Export de ${tableName}...`);
      const rows = await fetchAllPages(tableName, maxPS);
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

  const NUM_PARTS = 4;

  const exportAll = async () => {
    const allTables = tables;
    if (allTables.length === 0) {
      toast.warning('Aucune table à exporter');
      return;
    }
    setExporting(true);
    cancelRef.current = false;
    setExportProgress({ current: 0, total: allTables.length, tableName: '' });

    // Split tables into NUM_PARTS chunks
    const chunkSize = Math.ceil(allTables.length / NUM_PARTS);
    const chunks: TableInfo[][] = [];
    for (let c = 0; c < NUM_PARTS; c++) {
      chunks.push(allTables.slice(c * chunkSize, (c + 1) * chunkSize));
    }

    const failedTables: string[] = [];
    let globalIdx = 0;

    for (let partIdx = 0; partIdx < chunks.length; partIdx++) {
      if (cancelRef.current) break;
      const chunk = chunks[partIdx];
      const partData: Record<string, unknown[]> = {};

      for (let i = 0; i < chunk.length; i++) {
        if (cancelRef.current) break;
        const t = chunk[i];
        globalIdx++;
        setExportProgress({ current: globalIdx, total: allTables.length, tableName: `[${partIdx + 1}/${NUM_PARTS}] ${t.name}` });

        if (t.count === 0) {
          partData[t.name] = [];
          continue;
        }

        try {
          partData[t.name] = await fetchAllPages(t.name, t.maxPageSize);
        } catch {
          failedTables.push(t.name);
          partData[t.name] = [];
        }

        // Throttle between tables
        await delay(300);
      }

      // Download this part immediately
      const date = new Date().toISOString().split('T')[0];
      const partNum = partIdx + 1;
      if (exportFormat === 'sql') {
        const sqlContent = Object.entries(partData)
          .map(([name, rows]) => rowsToSQL(name, rows as Record<string, unknown>[]))
          .join('\n');
        downloadFile(sqlContent, `database-export-part${partNum}-${date}.sql`, 'text/sql');
      } else {
        downloadFile(JSON.stringify(partData, null, 2), `database-export-part${partNum}-${date}.json`, 'application/json');
      }
      toast.info(`Partie ${partNum}/${NUM_PARTS} téléchargée (${chunk.length} tables)`);

      // Small delay between part downloads
      if (partIdx < chunks.length - 1) {
        await delay(800);
      }
    }

    const successCount = allTables.length - failedTables.length;
    setExporting(false);

    if (failedTables.length === 0) {
      toast.success(`Export terminé : ${successCount}/${allTables.length} tables en ${NUM_PARTS} fichiers`);
    } else {
      toast.warning(`Export terminé : ${successCount}/${allTables.length} tables en ${NUM_PARTS} fichiers`, {
        description: `Échecs (${failedTables.length}) : ${failedTables.join(', ')}`,
        duration: 15000,
      });
    }
  };

  const totalRows = tables.reduce((s, t) => s + Math.max(t.count, 0), 0);
  const progressPct = exportProgress.total > 0 ? (exportProgress.current / exportProgress.total) * 100 : 0;
  const canExport = tables.length > 0;

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
                ? `${tables.length} tables · ${totalRows.toLocaleString()} lignes estimées`
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
            {canExport && (
              <Button size="sm" onClick={exportAll} disabled={exporting}>
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Tout exporter ({tables.length} tables → {NUM_PARTS} fichiers)
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
                    <TableHead className="text-right w-20">Taille</TableHead>
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
                          <span className="text-muted-foreground text-xs">~</span>
                        ) : (
                          t.count.toLocaleString()
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {t.maxPageSize <= 3 ? '🔴' : t.maxPageSize <= 10 ? '🟠' : t.maxPageSize <= 25 ? '🟡' : '🟢'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={t.count === 0 || exporting}
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
