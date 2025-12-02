/**
 * Page Auto-Classeur IA - Classification automatique des tickets sans module
 * Batch review avec seuil de confiance 85% et progress tracking
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Sparkles, FolderOpen, Check, X, AlertCircle, Zap, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { errorToast, successToast } from '@/lib/toastHelpers';
import { useQueryClient } from '@tanstack/react-query';

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

const CONFIDENCE_THRESHOLD = 0.85;
const BATCH_SIZE = 5;

export default function ApogeeTicketsAutoClassify() {
  const queryClient = useQueryClient();
  const [isScanning, setIsScanning] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [suggestions, setSuggestions] = useState<ClassificationSuggestion[]>([]);
  const [stats, setStats] = useState<ScanStats | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Progress tracking
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0, phase: '' });

  const runScan = useCallback(async () => {
    setIsScanning(true);
    setSuggestions([]);
    setStats(null);
    setSelectedIds(new Set());
    setScanProgress({ current: 0, total: 0, phase: 'Recherche des tickets...' });

    try {
      // Phase 1: Get list of tickets to classify
      const { data: scanData, error: scanError } = await supabase.functions.invoke('auto-classify-modules', {
        body: { mode: 'scan' }
      });

      if (scanError) throw scanError;

      const totalTickets = scanData.total_tickets || 0;
      const ticketsList = scanData.tickets || [];

      if (totalTickets === 0) {
        successToast('Aucun ticket sans module trouvé');
        setIsScanning(false);
        return;
      }

      setScanProgress({ current: 0, total: totalTickets, phase: 'Classification IA...' });

      // Phase 2: Classify in batches
      const allSuggestions: ClassificationSuggestion[] = [];
      
      for (let i = 0; i < ticketsList.length; i += BATCH_SIZE) {
        const batchIds = ticketsList.slice(i, i + BATCH_SIZE).map((t: { id: string }) => t.id);
        
        setScanProgress(prev => ({
          ...prev,
          current: Math.min(i + BATCH_SIZE, totalTickets),
          phase: `Classification ${Math.min(i + BATCH_SIZE, totalTickets)}/${totalTickets}...`
        }));

        const { data: batchData, error: batchError } = await supabase.functions.invoke('auto-classify-modules', {
          body: { mode: 'classify_batch', ticket_ids: batchIds }
        });

        if (batchError) {
          console.error('Batch error:', batchError);
          continue;
        }

        if (batchData.suggestions) {
          allSuggestions.push(...batchData.suggestions);
        }
      }

      // Calculate stats
      const finalStats: ScanStats = {
        total: allSuggestions.length,
        high_confidence: allSuggestions.filter(s => s.confidence >= CONFIDENCE_THRESHOLD && s.suggested_module !== 'AUTRE').length,
        low_confidence: allSuggestions.filter(s => s.confidence < CONFIDENCE_THRESHOLD || s.suggested_module === 'AUTRE').length,
        auto_applied: 0
      };

      setSuggestions(allSuggestions.sort((a, b) => b.confidence - a.confidence));
      setStats(finalStats);

      // Pre-select high confidence
      const highConfIds = allSuggestions
        .filter(s => s.confidence >= CONFIDENCE_THRESHOLD && s.suggested_module !== 'AUTRE')
        .map(s => s.ticket_id);
      setSelectedIds(new Set(highConfIds));

      successToast(`${allSuggestions.length} tickets analysés`);
    } catch (err) {
      console.error('Scan error:', err);
      errorToast('Erreur lors du scan');
    } finally {
      setIsScanning(false);
      setScanProgress({ current: 0, total: 0, phase: '' });
    }
  }, []);

  const applySelected = async () => {
    if (selectedIds.size === 0) {
      errorToast('Aucun ticket sélectionné');
      return;
    }

    setIsApplying(true);

    try {
      const selectedSuggestions = suggestions.filter(s => selectedIds.has(s.ticket_id));
      let appliedCount = 0;
      
      for (const suggestion of selectedSuggestions) {
        if (suggestion.suggested_module !== 'AUTRE') {
          const { error } = await supabase
            .from('apogee_tickets')
            .update({ module: suggestion.suggested_module })
            .eq('id', suggestion.ticket_id);
          
          if (!error) appliedCount++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['apogee-tickets'] });
      
      successToast(`${appliedCount} ticket(s) classé(s)`);
      
      // Remove applied tickets from list
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
  const progressPercent = scanProgress.total > 0 ? (scanProgress.current / scanProgress.total) * 100 : 0;

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
        <Button onClick={runScan} disabled={isScanning}>
          {isScanning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyse...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Scanner les tickets
            </>
          )}
        </Button>
      </div>

      {/* Progress bar during scan */}
      {isScanning && scanProgress.total > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{scanProgress.phase}</span>
                <span className="font-medium">{scanProgress.current}/{scanProgress.total}</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
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
          <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.high_confidence}</div>
              <p className="text-xs text-muted-foreground">Confiance ≥85%</p>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{stats.low_confidence}</div>
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
              Sélectionner ≥85% ({highConfCount})
            </Button>
            <Button variant="ghost" size="sm" onClick={selectNone}>
              <X className="h-4 w-4 mr-1" />
              Désélectionner
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
                Appliquer ({selectedIds.size})
              </>
            )}
          </Button>
        </div>
      )}

      {/* Suggestions list */}
      {suggestions.length > 0 && !isScanning ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Suggestions de classification
            </CardTitle>
            <CardDescription>
              Tickets avec confiance ≥85% seront classés. Les autres → "Autre".
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
                      } ${!isHighConf ? 'opacity-60' : ''}`}
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
                            <Badge variant={isHighConf ? "default" : "secondary"} className="shrink-0">
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
                                className={`h-2 ${isHighConf ? '[&>div]:bg-green-500' : '[&>div]:bg-amber-500'}`}
                              />
                            </div>
                            <span className={`text-xs font-medium min-w-[36px] text-right ${
                              isHighConf ? 'text-green-600' : 'text-amber-600'
                            }`}>
                              {Math.round(suggestion.confidence * 100)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      ) : !isScanning && suggestions.length === 0 && (
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
