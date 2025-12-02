/**
 * Page Auto-Classeur IA - Classification automatique des tickets sans module
 * Batch review avec seuil de confiance 85%
 */

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Sparkles, FolderOpen, Check, X, AlertCircle, Zap, RefreshCw, Square, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { errorToast, successToast, warningToast } from '@/lib/toastHelpers';
import { useQueryClient, useQuery } from '@tanstack/react-query';

interface ClassificationSuggestion {
  ticket_id: string;
  title: string;
  current_module: string | null;
  suggested_module: string;
  confidence: number;
  reasoning: string;
  auto_applied: boolean;
}

interface ScanStats {
  total: number;
  high_confidence: number;
  low_confidence: number;
  auto_applied: number;
}

export default function ApogeeTicketsAutoClassify() {
  const queryClient = useQueryClient();
  const [isScanning, setIsScanning] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [suggestions, setSuggestions] = useState<ClassificationSuggestion[]>([]);
  const [stats, setStats] = useState<ScanStats | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [scanProgress, setScanProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const CONFIDENCE_THRESHOLD = 0.85;

  // Compter les tickets sans module
  const { data: ticketsWithoutModule } = useQuery({
    queryKey: ['tickets-without-module-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('apogee_tickets')
        .select('id', { count: 'exact', head: true })
        .is('module', null)
        .neq('kanban_status', 'EN_PROD');
      
      if (error) throw error;
      return count || 0;
    }
  });

  // Timer pour l'affichage du temps écoulé
  useEffect(() => {
    if (isScanning) {
      setScanProgress(0);
      setElapsedTime(0);
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
        // Simulation de progression (estimation ~2s par ticket)
        setScanProgress(prev => Math.min(prev + (100 / ((ticketsWithoutModule || 50) * 2)), 95));
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isScanning, ticketsWithoutModule]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const stopScan = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsScanning(false);
    warningToast('Scan interrompu');
  };

  const runScan = async () => {
    setIsScanning(true);
    setSuggestions([]);
    setStats(null);
    setSelectedIds(new Set());
    
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auto-classify-modules`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ mode: 'scan', apply_changes: false }),
          signal: abortControllerRef.current.signal
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur serveur');
      }

      const data = await response.json();

      setSuggestions(data.suggestions || []);
      setStats(data.stats || null);
      setScanProgress(100);

      // Pré-sélectionner les tickets haute confiance
      const highConfIds = (data.suggestions || [])
        .filter((s: ClassificationSuggestion) => s.confidence >= CONFIDENCE_THRESHOLD && s.suggested_module !== 'AUTRE')
        .map((s: ClassificationSuggestion) => s.ticket_id);
      setSelectedIds(new Set(highConfIds));

      successToast(`${data.suggestions?.length || 0} tickets analysés en ${formatTime(elapsedTime)}`);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Scan annulé par l'utilisateur
        return;
      }
      console.error('Scan error:', err);
      errorToast('Erreur lors du scan');
    } finally {
      setIsScanning(false);
      abortControllerRef.current = null;
    }
  };

  const applySelected = async () => {
    if (selectedIds.size === 0) {
      errorToast('Aucun ticket sélectionné');
      return;
    }

    setIsApplying(true);

    try {
      const selectedSuggestions = suggestions.filter(s => selectedIds.has(s.ticket_id));
      
      for (const suggestion of selectedSuggestions) {
        if (suggestion.suggested_module !== 'AUTRE') {
          await supabase
            .from('apogee_tickets')
            .update({ module: suggestion.suggested_module })
            .eq('id', suggestion.ticket_id);
        }
      }

      // Refresh
      queryClient.invalidateQueries({ queryKey: ['apogee-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['tickets-without-module-count'] });
      
      successToast(`${selectedIds.size} ticket(s) classé(s)`);
      
      // Retirer les tickets appliqués de la liste
      setSuggestions(prev => prev.filter(s => !selectedIds.has(s.ticket_id)));
      setSelectedIds(new Set());
      
    } catch (err) {
      console.error('Apply error:', err);
      errorToast('Erreur lors de l\'application');
    } finally {
      setIsApplying(false);
    }
  };

  const toggleSelect = (ticketId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(ticketId)) {
        next.delete(ticketId);
      } else {
        next.add(ticketId);
      }
      return next;
    });
  };

  const selectAllHighConf = () => {
    const highConfIds = suggestions
      .filter(s => s.confidence >= CONFIDENCE_THRESHOLD && s.suggested_module !== 'AUTRE')
      .map(s => s.ticket_id);
    setSelectedIds(new Set(highConfIds));
  };

  const selectNone = () => setSelectedIds(new Set());

  const highConfCount = suggestions.filter(s => s.confidence >= CONFIDENCE_THRESHOLD && s.suggested_module !== 'AUTRE').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-amber-500" />
            Auto-Classeur IA
          </h2>
          <p className="text-muted-foreground">
            Classification automatique des tickets sans module (seuil 85%)
          </p>
        </div>
        <div className="flex gap-2">
          {isScanning ? (
            <Button variant="destructive" onClick={stopScan}>
              <Square className="h-4 w-4 mr-2" />
              Arrêter
            </Button>
          ) : (
            <Button onClick={runScan} disabled={isScanning}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Scanner les tickets {ticketsWithoutModule !== undefined && `(${ticketsWithoutModule})`}
            </Button>
          )}
        </div>
      </div>

      {/* Progression du scan */}
      {isScanning && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="pt-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
                  <span className="font-medium">Analyse en cours...</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {formatTime(elapsedTime)}
                </div>
              </div>
              <Progress value={scanProgress} className="h-2" />
              <p className="text-sm text-muted-foreground">
                L'IA analyse chaque ticket pour détecter le module approprié. 
                Estimation : ~{Math.ceil((ticketsWithoutModule || 50) * 1.5 / 60)} minutes pour {ticketsWithoutModule || '?'} tickets.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      {stats && !isScanning && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Tickets analysés</p>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-700">{stats.high_confidence}</div>
              <p className="text-xs text-muted-foreground">Confiance ≥85%</p>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-amber-700">{stats.low_confidence}</div>
              <p className="text-xs text-muted-foreground">Confiance &lt;85%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{selectedIds.size}</div>
              <p className="text-xs text-muted-foreground">Sélectionnés</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Actions */}
      {suggestions.length > 0 && !isScanning && (
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAllHighConf}>
              <Check className="h-4 w-4 mr-1" />
              Sélectionner confiance ≥85% ({highConfCount})
            </Button>
            <Button variant="ghost" size="sm" onClick={selectNone}>
              <X className="h-4 w-4 mr-1" />
              Désélectionner tout
            </Button>
          </div>
          <Button 
            onClick={applySelected} 
            disabled={isApplying || selectedIds.size === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            {isApplying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Application...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Appliquer la classification ({selectedIds.size})
              </>
            )}
          </Button>
        </div>
      )}

      {/* Liste des suggestions */}
      {suggestions.length > 0 && !isScanning ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Suggestions de classification
            </CardTitle>
            <CardDescription>
              Les tickets avec confiance ≥85% seront classés automatiquement. Les autres iront dans "Autre".
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {suggestions.map((suggestion) => {
                  const isHighConf = suggestion.confidence >= CONFIDENCE_THRESHOLD && suggestion.suggested_module !== 'AUTRE';
                  const isSelected = selectedIds.has(suggestion.ticket_id);

                  return (
                    <div
                      key={suggestion.ticket_id}
                      className={`p-3 rounded-lg border transition-colors ${
                        isSelected ? 'bg-primary/5 border-primary/30' : 'hover:bg-muted/50'
                      } ${!isHighConf ? 'opacity-70' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(suggestion.ticket_id)}
                          disabled={suggestion.suggested_module === 'AUTRE'}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium truncate">{suggestion.title}</span>
                            <Badge variant="outline" className="shrink-0">
                              → {suggestion.suggested_module}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {suggestion.reasoning}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-2">
                            <div className="w-16">
                              <Progress 
                                value={suggestion.confidence * 100} 
                                className="h-2"
                              />
                            </div>
                            <span className={`text-xs font-medium ${
                              isHighConf ? 'text-green-600' : 'text-amber-600'
                            }`}>
                              {Math.round(suggestion.confidence * 100)}%
                            </span>
                          </div>
                          {!isHighConf && (
                            <span className="text-xs text-muted-foreground">
                              → Autre (confiance insuffisante)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      ) : !isScanning && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Cliquez sur "Scanner les tickets" pour analyser les tickets sans module assigné.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
