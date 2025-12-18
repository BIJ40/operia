/**
 * Flow Runner - Main Wizard Component
 * Executes a flow step by step for technicians
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Check, Loader2, Save, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FlowFieldRenderer } from './FlowFieldRenderer';
import { findNextNode } from '@/lib/flow/conditionEvaluator';
import {
  technicianDB,
  saveDraft,
  getDraft,
  addToOutbox,
  generateUUID,
  type DraftEntry,
} from '@/lib/offline/db';
import type { FlowSchemaJson, FlowNode, QuestionBlock } from '@/lib/flow/flowTypes';
import { useToast } from '@/hooks/use-toast';

interface FlowRunnerProps {
  flowSchema: FlowSchemaJson;
  blocks: Map<string, QuestionBlock>;
  rdvId: string;
  flowId: string;
  flowVersion: number;
  onComplete?: () => void;
}

export function FlowRunner({
  flowSchema,
  blocks,
  rdvId,
  flowId,
  flowVersion,
  onComplete,
}: FlowRunnerProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State
  const [currentNodeId, setCurrentNodeId] = useState<string>(flowSchema.rootNodeId);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [history, setHistory] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Get current node
  const currentNode = useMemo(() => {
    return flowSchema.nodes.find((n) => n.id === currentNodeId);
  }, [flowSchema.nodes, currentNodeId]);

  // Get block for current node
  const currentBlock = useMemo(() => {
    if (!currentNode?.blockId) return null;
    return blocks.get(currentNode.blockId);
  }, [currentNode, blocks]);

  // Calculate progress
  const progress = useMemo(() => {
    const totalNodes = flowSchema.nodes.filter((n) => n.type === 'block').length;
    const visitedBlocks = history.filter((id) => {
      const node = flowSchema.nodes.find((n) => n.id === id);
      return node?.type === 'block';
    }).length;
    return totalNodes > 0 ? Math.round((visitedBlocks / totalNodes) * 100) : 0;
  }, [history, flowSchema.nodes]);

  // Check if current node is terminal
  const isTerminal = currentNode?.type === 'terminal';

  // Load existing draft
  useEffect(() => {
    async function loadDraft() {
      try {
        const draft = await getDraft(rdvId);
        if (draft && draft.flow_id === flowId) {
          setAnswers(draft.answers_json);
          setCurrentNodeId(draft.current_node_id);
          setHistory(draft.history);
        }
      } catch (err) {
        console.error('Failed to load draft:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadDraft();
  }, [rdvId, flowId]);

  // Auto-save draft on changes
  const saveDraftDebounced = useCallback(async () => {
    if (isLoading) return;
    
    try {
      const draft: DraftEntry = {
        key: rdvId,
        flow_id: flowId,
        version: flowVersion,
        answers_json: answers,
        current_node_id: currentNodeId,
        history,
        updated_at: Date.now(),
        status: 'draft',
      };
      await saveDraft(draft);
    } catch (err) {
      console.error('Failed to save draft:', err);
    }
  }, [rdvId, flowId, flowVersion, answers, currentNodeId, history, isLoading]);

  useEffect(() => {
    const timeout = setTimeout(saveDraftDebounced, 500);
    return () => clearTimeout(timeout);
  }, [saveDraftDebounced]);

  // Handle field change
  const handleFieldChange = useCallback((key: string, value: unknown) => {
    setValidationError(null);
    setAnswers((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  // Validate current step
  const validateCurrentStep = useCallback((): boolean => {
    if (!currentBlock) return true;

    for (const field of currentBlock.schema.fields) {
      if (field.required) {
        const value = answers[field.key];
        if (value === undefined || value === null || value === '') {
          setValidationError(`Le champ "${field.label}" est requis`);
          return false;
        }
      }
    }
    return true;
  }, [currentBlock, answers]);

  // Go to next node
  const handleNext = useCallback(() => {
    if (!validateCurrentStep()) return;

    const nextNodeId = findNextNode(currentNodeId, flowSchema.edges, answers);
    if (nextNodeId) {
      setHistory((prev) => [...prev, currentNodeId]);
      setCurrentNodeId(nextNodeId);
      setValidationError(null);
    }
  }, [currentNodeId, flowSchema.edges, answers, validateCurrentStep]);

  // Go back
  const handleBack = useCallback(() => {
    if (history.length === 0) return;
    
    const previousNodeId = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setCurrentNodeId(previousNodeId);
    setValidationError(null);
  }, [history]);

  // Manual save
  const handleManualSave = async () => {
    setIsSaving(true);
    try {
      await saveDraftDebounced();
      toast({
        title: 'Brouillon sauvegardé',
        description: 'Votre progression a été enregistrée',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Submit flow
  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    setIsSubmitting(true);
    try {
      // Mark draft as ready to submit
      const draft: DraftEntry = {
        key: rdvId,
        flow_id: flowId,
        version: flowVersion,
        answers_json: answers,
        current_node_id: currentNodeId,
        history,
        updated_at: Date.now(),
        status: 'ready_to_submit',
      };
      await saveDraft(draft);

      // Add to outbox
      const clientOperationId = generateUUID();
      await addToOutbox({
        rdv_id: rdvId,
        op_type: 'SUBMIT_FLOW',
        payload_json: {
          flow_id: flowId,
          flow_version: flowVersion,
          answers: answers,
          completed_at: new Date().toISOString(),
        },
        client_operation_id: clientOperationId,
      });

      toast({
        title: 'Formulaire terminé',
        description: 'Les données seront synchronisées automatiquement',
      });

      onComplete?.();
      navigate('/t');
    } catch (err) {
      console.error('Failed to submit:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible de soumettre le formulaire',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // No current node
  if (!currentNode) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Erreur: nœud non trouvé</AlertDescription>
      </Alert>
    );
  }

  // Terminal node - show summary and submit
  if (isTerminal) {
    return (
      <div className="space-y-4 p-4">
        <Progress value={100} className="h-2" />
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              {currentNode.data.label || 'Terminé'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Vous avez terminé le formulaire. Vérifiez vos réponses puis validez.
            </p>
            
            {/* Summary of answers */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 max-h-60 overflow-auto">
              {Object.entries(answers).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{key}:</span>
                  <span className="font-medium truncate max-w-[60%]">
                    {typeof value === 'string' && value.startsWith('data:image')
                      ? '📷 Photo'
                      : String(value ?? '-')}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleBack} disabled={history.length === 0}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Retour
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1">
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Valider et soumettre
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Regular block node
  return (
    <div className="space-y-4 p-4">
      {/* Progress bar */}
      <div className="space-y-1">
        <Progress value={progress} className="h-2" />
        <p className="text-xs text-muted-foreground text-right">{progress}%</p>
      </div>

      {/* Question card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            {currentNode.data.label || currentBlock?.name || 'Question'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Fields */}
          {currentBlock?.schema.fields.map((field) => (
            <FlowFieldRenderer
              key={field.key}
              field={field}
              value={answers[field.key]}
              onChange={handleFieldChange}
            />
          ))}

          {/* Validation error */}
          {validationError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={history.length === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Retour
        </Button>
        
        <Button
          variant="ghost"
          onClick={handleManualSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
        </Button>

        <Button onClick={handleNext} className="flex-1">
          Suivant
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
