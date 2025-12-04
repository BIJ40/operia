// Page du runner de questions RT

import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { RtQuestionRunner } from '../components/RtQuestionRunner';
import { RtSummaryScreen } from '../components/RtSummaryScreen';
import { useRtSession } from '../hooks/useRtSession';
import { useTechPlanning } from '../hooks/useTechPlanning';
import { InterventionMode, TechIntervention } from '../types';
import { toast } from 'sonner';

type PageState = 'loading' | 'runner' | 'summary';

export function RtRunnerPage() {
  const { interventionId } = useParams<{ interventionId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mode = (searchParams.get('mode') as InterventionMode) || 'rt';
  
  const { getIntervention, updateRtStatus } = useTechPlanning();
  const {
    session,
    isLoading,
    currentNode,
    runnerState,
    startSession,
    setAnswer,
    goNext,
    goBack,
    canGoBack,
    isAtEnd,
    addPhoto,
    submitSuggestion,
    completeSession,
    getAnswersSummary,
    getAllPhotos,
  } = useRtSession();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [intervention, setIntervention] = useState<TechIntervention | null>(null);

  // Initialize session on mount
  useEffect(() => {
    if (!interventionId) {
      navigate('/hc-agency/tech-interventions');
      return;
    }

    const int = getIntervention(interventionId);
    if (!int) {
      toast.error('Intervention non trouvée');
      navigate('/hc-agency/tech-interventions');
      return;
    }

    setIntervention(int);
    startSession(interventionId, mode);
    setPageState('runner');
  }, [interventionId, mode]);

  // Handle navigation to summary when at end
  const handleComplete = () => {
    setPageState('summary');
  };

  // Handle back from summary
  const handleBackFromSummary = () => {
    setPageState('runner');
  };

  // Handle edit question from summary
  const handleEditQuestion = (nodeId: string) => {
    // TODO: Navigate to specific question
    toast.info('Navigation vers la question : ' + nodeId);
    setPageState('runner');
  };

  // Handle PDF generation (mock)
  const handleGeneratePdf = async () => {
    // Simulate PDF generation delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (interventionId) {
      updateRtStatus(interventionId, 'pdf_sent');
      completeSession();
    }
    
    // Navigate back to list
    setTimeout(() => {
      navigate('/hc-agency/tech-interventions');
    }, 1500);
  };

  // Handle save draft
  const handleSaveDraft = () => {
    toast.success('Brouillon enregistré');
    navigate('/hc-agency/tech-interventions');
  };

  // Handle suggestion submission
  const handleSubmitSuggestion = (data: { 
    suggestion_text: string; 
    position_hint: string; 
    suggested_type: string 
  }) => {
    if (!currentNode || !runnerState) return;
    
    submitSuggestion({
      tech_id: 1, // Mock
      univers: runnerState.breadcrumb[0] || 'plomberie',
      branch_id: currentNode.branch || '',
      node_id_context: currentNode.id,
      suggestion_text: data.suggestion_text,
      suggested_type: data.suggested_type as any,
      position_hint: data.position_hint as any,
    });
  };

  // Loading state
  if (pageState === 'loading' || isLoading || !intervention) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Summary screen
  if (pageState === 'summary') {
    return (
      <RtSummaryScreen
        intervention={intervention}
        answers={getAnswersSummary()}
        photos={getAllPhotos()}
        onBack={handleBackFromSummary}
        onEditQuestion={handleEditQuestion}
        onGeneratePdf={handleGeneratePdf}
        onSaveDraft={handleSaveDraft}
      />
    );
  }

  // Runner screen
  if (!currentNode || !runnerState) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Erreur: question non trouvée</p>
      </div>
    );
  }

  return (
    <RtQuestionRunner
      currentNode={currentNode}
      runnerState={runnerState}
      onAnswer={setAnswer}
      onNext={goNext}
      onBack={goBack}
      canGoBack={canGoBack()}
      onAddPhoto={addPhoto}
      onSubmitSuggestion={handleSubmitSuggestion}
      onComplete={handleComplete}
    />
  );
}

export default RtRunnerPage;
