import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { apogeeProxy } from '@/services/apogeeProxy';
import { stateLabel } from '@/shared/utils/stateLabels';
import { useAgency } from '@/apogee-connect/contexts/AgencyContext';
import {
  FileText, FolderOpen,
  Search, Loader2, ExternalLink,
  FileWarning, ShieldCheck, Code, Info,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Recursively find all objects that look like documents (have url + fileName) */
function findDocumentObjects(obj: unknown, path = ''): Array<{ path: string; doc: Record<string, unknown> }> {
  const results: Array<{ path: string; doc: Record<string, unknown> }> = [];
  if (!obj || typeof obj !== 'object') return results;

  if (!Array.isArray(obj)) {
    const record = obj as Record<string, unknown>;
    // Check if this object looks like a document (has url or fileName)
    if (typeof record.url === 'string' && (typeof record.fileName === 'string' || typeof record.type === 'string')) {
      results.push({ path, doc: record });
      return results;
    }
    // Recurse into properties
    for (const [key, value] of Object.entries(record)) {
      results.push(...findDocumentObjects(value, path ? `${path}.${key}` : key));
    }
  } else {
    for (let i = 0; i < obj.length; i++) {
      results.push(...findDocumentObjects(obj[i], `${path}[${i}]`));
    }
  }

  return results;
}

/** Get top-level keys summary for debug */
function getKeysSummary(obj: unknown): string[] {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return [];
  return Object.keys(obj as Record<string, unknown>);
}

// ─── Props ───────────────────────────────────────────────────────────────────
interface ApogeeDocumentsExplorerProps {
  defaultRef?: string;
  defaultHash?: string;
  defaultZipCode?: string;
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function ApogeeDocumentsExplorer({
  defaultRef = '',
  defaultHash = '',
  defaultZipCode = '',
}: ApogeeDocumentsExplorerProps) {
  const { currentAgency } = useAgency();

  const [ref, setRef] = useState(defaultRef);
  const [hash, setHash] = useState(defaultHash);
  const [zipCode, setZipCode] = useState(defaultZipCode);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawResult, setRawResult] = useState<unknown>(null);
  const [rawJson, setRawJson] = useState<string | null>(null);

  const canSearch = ref.trim() && hash.trim() && zipCode.trim() && currentAgency?.slug;

  const handleSearch = useCallback(async () => {
    if (!canSearch) return;
    setLoading(true);
    setError(null);
    setRawResult(null);
    setRawJson(null);

    try {
      const response = await apogeeProxy.getProjectByHash<unknown>({
        agencySlug: currentAgency!.slug,
        filters: {
          ref: ref.trim(),
          hash: hash.trim(),
          zipCode: zipCode.trim(),
        },
      });

      setRawResult(response);
      setRawJson(JSON.stringify(response, null, 2));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la récupération';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [canSearch, currentAgency, ref, hash, zipCode]);

  // Auto-discover documents in the response tree
  const discoveredDocs = useMemo(() => {
    if (!rawResult) return [];
    return findDocumentObjects(rawResult);
  }, [rawResult]);

  const topLevelKeys = useMemo(() => getKeysSummary(rawResult), [rawResult]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FolderOpen className="h-5 w-5 text-primary" />
          Documents générés – Recherche par dossier
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* ── Search form ────────────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="doc-ref">Réf dossier</Label>
            <Input id="doc-ref" placeholder="ex: 12345" value={ref} onChange={(e) => setRef(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doc-hash">Hash client (MD5)</Label>
            <Input id="doc-hash" placeholder="ex: a1b2c3…" value={hash} onChange={(e) => setHash(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doc-zip">Code postal</Label>
            <Input id="doc-zip" placeholder="ex: 40100" value={zipCode} onChange={(e) => setZipCode(e.target.value)} />
          </div>
        </div>

        <Button onClick={handleSearch} disabled={!canSearch || loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Rechercher les documents
        </Button>

        {/* ── Error ──────────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <FileWarning className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* ── Results ────────────────────────────────────────────────── */}
        {rawResult !== null && (
          <div className="space-y-6">
            {/* Debug: top-level keys */}
            {topLevelKeys.length > 0 && (
              <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Info className="h-4 w-4 text-primary" />
                  Clés de premier niveau de la réponse
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {topLevelKeys.map((key) => (
                    <Badge key={key} variant="outline" className="text-xs font-mono">{key}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Auto-discovered documents */}
            {discoveredDocs.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">
                  🔍 {discoveredDocs.length} document{discoveredDocs.length > 1 ? 's' : ''} détecté{discoveredDocs.length > 1 ? 's' : ''} automatiquement
                </p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {discoveredDocs.map(({ path, doc }, i) => (
                    <a
                      key={`${path}-${i}`}
                      href={doc.url as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-start gap-3 rounded-lg border border-border bg-card p-4 transition-all hover:shadow-md hover:border-primary/40"
                    >
                      <FileText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {(doc.fileName as string) || (doc.type as string) || 'Document'}
                        </p>
                        {doc.data && typeof doc.data === 'object' && (doc.data as Record<string, unknown>).docLabel && (
                          <p className="text-xs text-muted-foreground">
                            {(doc.data as Record<string, unknown>).docLabel as string}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">{path}</Badge>
                          {doc.kind && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{doc.kind as string}</Badge>}
                          {doc.state && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{stateLabel(doc.state as string)}</Badge>}
                          {doc.data && typeof doc.data === 'object' && (doc.data as Record<string, unknown>).isSignature && (
                            <Badge variant="default" className="gap-1 text-[10px] px-1.5 py-0">
                              <ShieldCheck className="h-3 w-3" /> Signé
                            </Badge>
                          )}
                        </div>
                      </div>
                      <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucun objet document (url + fileName) trouvé dans la réponse. Inspectez le JSON brut ci-dessous.
              </p>
            )}

            {/* ── Raw JSON debug — open by default ───────────────────── */}
            {rawJson && (
              <details open className="rounded-md border border-border">
                <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Code className="h-3.5 w-3.5" />
                  Réponse JSON brute ({rawJson.length} caractères)
                </summary>
                <pre className="max-h-96 overflow-auto border-t border-border bg-muted/50 p-3 text-xs">
                  {rawJson}
                </pre>
              </details>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
