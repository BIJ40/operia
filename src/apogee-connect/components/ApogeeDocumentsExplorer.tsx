import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { apogeeProxy } from '@/services/apogeeProxy';
import { useAgency } from '@/apogee-connect/contexts/AgencyContext';
import { formatDateTime } from '@/apogee-connect/utils/formatters';
import {
  FileText, FileCheck, Wrench, FolderOpen,
  Search, Loader2, ExternalLink, ChevronDown,
  FileWarning, ShieldCheck, Code,
} from 'lucide-react';
import type {
  ApogeeGeneratedDoc,
  ApogeeGeneratedDocsResponse,
  DocCategory,
} from '@/apogee-connect/types/generatedDocs';
import { DOC_CATEGORIES } from '@/apogee-connect/types/generatedDocs';

// ─── Icon mapping ────────────────────────────────────────────────────────────
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  FileText: <FileText className="h-5 w-5" />,
  FileCheck: <FileCheck className="h-5 w-5" />,
  Wrench: <Wrench className="h-5 w-5" />,
  FolderOpen: <FolderOpen className="h-5 w-5" />,
};

// ─── Props ───────────────────────────────────────────────────────────────────
interface ApogeeDocumentsExplorerProps {
  /** Pré-remplissage depuis un dossier existant */
  defaultRef?: string;
  defaultHash?: string;
  defaultZipCode?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function flattenDocs(nested: ApogeeGeneratedDoc[][] | undefined): ApogeeGeneratedDoc[] {
  if (!nested || !Array.isArray(nested)) return [];
  return nested.flat();
}

// ─── DocTile ─────────────────────────────────────────────────────────────────
function DocTile({ doc }: { doc: ApogeeGeneratedDoc }) {
  return (
    <a
      href={doc.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start gap-3 rounded-lg border border-border bg-card p-4 transition-all hover:shadow-md hover:border-primary/40"
    >
      <FileText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate text-sm font-medium text-foreground">{doc.fileName}</p>
        {doc.data?.docLabel && (
          <p className="text-xs text-muted-foreground">{doc.data.docLabel}</p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">{formatDateTime(doc.created_at)}</span>
          {doc.kind && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{doc.kind}</Badge>
          )}
          {doc.data?.isSignature && (
            <Badge variant="default" className="gap-1 text-[10px] px-1.5 py-0">
              <ShieldCheck className="h-3 w-3" /> Signé
            </Badge>
          )}
          {doc.data?.size ? (
            <span className="text-[10px] text-muted-foreground">{formatSize(doc.data.size)}</span>
          ) : null}
        </div>
      </div>
      <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </a>
  );
}

// ─── CategorySection ─────────────────────────────────────────────────────────
function CategorySection({ category, docs }: { category: DocCategory; docs: ApogeeGeneratedDoc[] }) {
  if (docs.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {CATEGORY_ICONS[category.icon]}
        <h3 className="text-base font-semibold text-foreground">{category.label}</h3>
        <Badge variant="outline" className="ml-auto">{docs.length}</Badge>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {docs.map((doc) => (
          <DocTile key={doc.id} doc={doc} />
        ))}
      </div>
    </div>
  );
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
  const [result, setResult] = useState<ApogeeGeneratedDocsResponse | null>(null);
  const [rawJson, setRawJson] = useState<string | null>(null);

  const canSearch = ref.trim() && hash.trim() && zipCode.trim() && currentAgency?.slug;

  const handleSearch = useCallback(async () => {
    if (!canSearch) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setRawJson(null);

    try {
      const response = await apogeeProxy.getProjectByHash<ApogeeGeneratedDocsResponse>({
        agencySlug: currentAgency!.slug,
        filters: {
          ref: ref.trim(),
          hash: hash.trim(),
          zipCode: zipCode.trim(),
        },
      });

      setResult(response);
      setRawJson(JSON.stringify(response, null, 2));
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la récupération des documents');
    } finally {
      setLoading(false);
    }
  }, [canSearch, currentAgency, ref, hash, zipCode]);

  const totalDocs = result
    ? DOC_CATEGORIES.reduce((sum, cat) => sum + flattenDocs(result[cat.key]).length, 0)
    : 0;

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
            <Input
              id="doc-ref"
              placeholder="ex: 12345"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doc-hash">Hash client (MD5)</Label>
            <Input
              id="doc-hash"
              placeholder="ex: a1b2c3…"
              value={hash}
              onChange={(e) => setHash(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doc-zip">Code postal</Label>
            <Input
              id="doc-zip"
              placeholder="ex: 40100"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
            />
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
        {result && (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              {totalDocs === 0
                ? 'Aucun document trouvé pour ce dossier.'
                : `${totalDocs} document${totalDocs > 1 ? 's' : ''} trouvé${totalDocs > 1 ? 's' : ''}`}
            </p>

            {DOC_CATEGORIES.map((cat) => (
              <CategorySection
                key={cat.key}
                category={cat}
                docs={flattenDocs(result[cat.key])}
              />
            ))}

            {/* ── Raw JSON debug ─────────────────────────────────────── */}
            {rawJson && (
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Code className="h-3.5 w-3.5" />
                  Réponse JSON brute
                  <ChevronDown className="h-3.5 w-3.5" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <pre className="mt-2 max-h-80 overflow-auto rounded-md border border-border bg-muted/50 p-3 text-xs">
                    {rawJson}
                  </pre>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
