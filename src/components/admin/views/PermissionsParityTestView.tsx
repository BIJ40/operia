import { useState, useEffect } from 'react';
import { useParityTest, ParityResult } from '@/hooks/access-rights/useParityTest';
import { usePermissionsBridge } from '@/hooks/usePermissionsBridge';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, ChevronDown, ChevronRight, Download, AlertTriangle, CheckCircle } from 'lucide-react';

function exportCsv(results: ParityResult[]) {
  const headers = ['Email', 'Nom', 'Rôle', 'V1', 'V2', 'Matches', 'Régressions', 'Ajouts V2', 'Status'];
  const rows = results.map(r => [
    r.email,
    r.fullName,
    r.role,
    r.totalV1,
    r.totalV2,
    r.matches,
    r.v1Only.join('|'),
    r.v2Only.join('|'),
    r.pass ? 'OK' : 'ÉCART',
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `parite_v1_v2_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function ResultRow({ result }: { result: ParityResult }) {
  const [expanded, setExpanded] = useState(false);
  const hasEcarts = !result.pass || result.v2Only.length > 0;

  return (
    <>
      <TableRow
        className={!result.pass ? 'bg-destructive/5 hover:bg-destructive/10' : ''}
        onClick={() => hasEcarts && setExpanded(!expanded)}
        style={{ cursor: hasEcarts ? 'pointer' : 'default' }}
      >
        <TableCell>
          <div className="flex items-center gap-2">
            {hasEcarts ? (
              expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-600" />
            )}
            <div className="min-w-0">
              <div className="font-medium text-sm truncate">{result.fullName || result.email}</div>
              <div className="text-xs text-muted-foreground truncate">{result.email}</div>
            </div>
          </div>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {result.role}
        </TableCell>
        <TableCell className="text-sm">{result.totalV1}</TableCell>
        <TableCell className="text-sm">{result.totalV2}</TableCell>
        <TableCell className="text-sm">
          {result.matches}/{result.totalV1}
        </TableCell>
        <TableCell>
          <div className="flex gap-1 flex-wrap">
            {result.v1Only.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                -{result.v1Only.length} V1
              </Badge>
            )}
            {result.v2Only.length > 0 && (
              <Badge className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-200">
                +{result.v2Only.length} V2
              </Badge>
            )}
            {result.pass && result.v2Only.length === 0 && (
              <span className="text-xs text-green-600">✓</span>
            )}
          </div>
        </TableCell>
      </TableRow>

      {expanded && hasEcarts && (
        <TableRow>
          <TableCell colSpan={6} className="bg-muted/30 p-4">
            {result.v1Only.length > 0 && (
              <div className="mb-3">
                <p className="text-sm font-medium text-destructive mb-1">
                  Régressions — présents en V1, absents en V2 :
                </p>
                <div className="flex flex-wrap gap-1">
                  {result.v1Only.map(k => (
                    <Badge key={k} variant="destructive" className="text-xs">{k}</Badge>
                  ))}
                </div>
              </div>
            )}
            {result.v2Only.length > 0 && (
              <div>
                <p className="text-sm font-medium text-blue-700 mb-1">
                  Ajouts V2 — présents en V2, absents en V1 :
                </p>
                <div className="flex flex-wrap gap-1">
                  {result.v2Only.map(k => (
                    <Badge key={k} className="text-xs bg-blue-100 text-blue-800">{k}</Badge>
                  ))}
                </div>
              </div>
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export function PermissionsParityTestView() {
  const { isAdmin, globalRole } = usePermissionsBridge();
  const canView = isAdmin || globalRole === 'franchisor_admin';

  const { state, run, reset } = useParityTest();
  const [agencies, setAgencies] = useState<{ id: string; label: string }[]>([]);
  const [selectedAgency, setSelectedAgency] = useState('');

  useEffect(() => {
    supabase
      .from('apogee_agencies')
      .select('id, label')
      .eq('is_active', true)
      .order('label')
      .limit(200)
      .then(({ data }) => setAgencies(data ?? []));
  }, []);

  if (!canView) {
    return <p className="text-muted-foreground p-4">Accès réservé aux administrateurs N4+.</p>;
  }

  const failing = state.results.filter(r => !r.pass);
  const passing = state.results.filter(r => r.pass);
  const progressPct = state.total > 0 ? Math.round((state.progress / state.total) * 100) : 0;

  // Trier : échecs en haut
  const sorted = [...state.results].sort((a, b) => {
    if (!a.pass && b.pass) return -1;
    if (a.pass && !b.pass) return 1;
    return b.v1Only.length - a.v1Only.length;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Parité V1 / V2</h2>
          <p className="text-sm text-muted-foreground">
            Vérifie qu'aucun utilisateur ne perd des droits lors de la migration vers V2.
          </p>
        </div>
        <Badge variant="outline">V2</Badge>
      </div>

      {/* Contrôles */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          className="border border-input bg-background text-foreground rounded-md px-3 py-2 text-sm"
          value={selectedAgency}
          onChange={(e) => setSelectedAgency(e.target.value)}
          disabled={state.isRunning}
        >
          <option value="">Toutes les agences</option>
          {agencies.map(a => (
            <option key={a.id} value={a.id}>{a.label}</option>
          ))}
        </select>

        <Button
          onClick={() => run(selectedAgency || null)}
          disabled={state.isRunning}
        >
          {state.isRunning ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> En cours...</>
          ) : 'Lancer le test'}
        </Button>

        {state.results.length > 0 && !state.isRunning && (
          <>
            <Button variant="outline" onClick={reset}>
              Réinitialiser
            </Button>
            <Button variant="outline" onClick={() => exportCsv(state.results)}>
              <Download className="h-4 w-4 mr-1" />
              CSV
            </Button>
          </>
        )}
      </div>

      {/* Barre de progression */}
      {state.isRunning && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Analyse en cours... {state.progress}/{state.total} utilisateurs</span>
            <span>{progressPct}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Résumé */}
      {state.results.length > 0 && !state.isRunning && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card">
          {failing.length === 0 ? (
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
          )}
          <div>
            <p className="font-medium text-foreground">
              {failing.length === 0
                ? `✓ Parité confirmée — ${passing.length} utilisateurs testés, aucune régression`
                : `⚠ ${failing.length} régression${failing.length > 1 ? 's' : ''} détectée${failing.length > 1 ? 's' : ''} sur ${state.results.length} utilisateurs`
              }
            </p>
            {failing.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                Corrigez les régressions avant de basculer sur V2.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tableau des résultats */}
      {state.results.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>V1</TableHead>
                <TableHead>V2</TableHead>
                <TableHead>Commun</TableHead>
                <TableHead>Écarts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map(r => (
                <ResultRow key={r.userId} result={r} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {state.error && (
        <div className="text-destructive text-sm p-3 bg-destructive/10 rounded-lg">
          Erreur : {state.error}
        </div>
      )}
    </div>
  );
}

export default PermissionsParityTestView;
