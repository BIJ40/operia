// Écran C - Runner d'arbre de questions (une question par écran)

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Camera, HelpCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { QuestionNode, RunnerState } from '../types';
import { MissingQuestionDialog } from './MissingQuestionDialog';
import { AddPhotoButton } from './AddPhotoButton';

interface RtQuestionRunnerProps {
  currentNode: QuestionNode;
  runnerState: RunnerState;
  onAnswer: (nodeId: string, value: any) => void;
  onNext: () => void;
  onBack: () => void;
  canGoBack: boolean;
  onAddPhoto: (nodeId: string, url: string) => void;
  onSubmitSuggestion: (data: { suggestion_text: string; position_hint: string; suggested_type: string }) => void;
  onComplete: () => void;
}

export function RtQuestionRunner({
  currentNode,
  runnerState,
  onAnswer,
  onNext,
  onBack,
  canGoBack,
  onAddPhoto,
  onSubmitSuggestion,
  onComplete,
}: RtQuestionRunnerProps) {
  const [showSuggestionDialog, setShowSuggestionDialog] = useState(false);
  const currentAnswer = runnerState.answers[currentNode.id];
  const currentPhotos = runnerState.photos[currentNode.id] || [];
  const progressPercent = (runnerState.progress.current / runnerState.progress.total) * 100;

  const handleAnswerChange = (value: any) => {
    onAnswer(currentNode.id, value);
  };

  const canProceed = () => {
    if (!currentNode.required) return true;
    if (currentAnswer === undefined || currentAnswer === null || currentAnswer === '') return false;
    if (Array.isArray(currentAnswer) && currentAnswer.length === 0) return false;
    return true;
  };

  const handleNext = () => {
    if (currentNode.isEnd) {
      onComplete();
    } else {
      onNext();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top bar: breadcrumb + progress */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 space-y-2">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          {runnerState.breadcrumb.map((item, idx) => (
            <span key={idx} className="flex items-center gap-1">
              {idx > 0 && <span className="text-muted-foreground">·</span>}
              <span className={idx === runnerState.breadcrumb.length - 1 ? 'font-medium' : 'text-muted-foreground'}>
                {item}
              </span>
            </span>
          ))}
        </div>
        
        {/* Progress */}
        <div className="flex items-center gap-3">
          <Progress value={progressPercent} className="flex-1 h-2" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {runnerState.progress.current} / {runnerState.progress.total}
          </span>
        </div>
      </div>

      {/* Question content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-lg mx-auto space-y-6">
          {/* Question ID (debug) */}
          <Badge variant="outline" className="text-xs">
            {currentNode.id}
          </Badge>

          {/* Question text */}
          <h2 className="text-xl font-semibold leading-tight">
            {currentNode.question}
          </h2>

          {/* Answer input based on type */}
          <div className="space-y-3">
            {currentNode.type === 'boolean' && (
              <BooleanInput value={currentAnswer} onChange={handleAnswerChange} />
            )}
            
            {currentNode.type === 'single_choice' && currentNode.options && (
              <SingleChoiceInput 
                options={currentNode.options} 
                value={currentAnswer} 
                onChange={handleAnswerChange} 
              />
            )}
            
            {currentNode.type === 'multi_choice' && currentNode.options && (
              <MultiChoiceInput 
                options={currentNode.options} 
                value={currentAnswer || []} 
                onChange={handleAnswerChange} 
              />
            )}
            
            {currentNode.type === 'text' && (
              <Input
                value={currentAnswer || ''}
                onChange={(e) => handleAnswerChange(e.target.value)}
                placeholder={currentNode.placeholder || 'Votre réponse...'}
                className="text-base h-12"
              />
            )}
            
            {currentNode.type === 'text_long' && (
              <Textarea
                value={currentAnswer || ''}
                onChange={(e) => handleAnswerChange(e.target.value)}
                placeholder={currentNode.placeholder || 'Votre réponse détaillée...'}
                className="min-h-[120px] text-base"
              />
            )}
            
            {currentNode.type === 'number' && (
              <Input
                type="number"
                value={currentAnswer || ''}
                onChange={(e) => handleAnswerChange(e.target.value ? Number(e.target.value) : '')}
                placeholder={currentNode.placeholder || '0'}
                className="text-base h-12"
              />
            )}
            
            {currentNode.type === 'info' && (
              <div className="p-4 bg-muted rounded-lg text-center">
                <Check className="h-12 w-12 mx-auto text-green-600 mb-2" />
                <p className="text-muted-foreground">
                  Vous avez répondu à toutes les questions de cette branche.
                </p>
              </div>
            )}
          </div>

          {/* Photos attached to this question */}
          {currentPhotos.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Camera className="h-4 w-4" />
              <span>{currentPhotos.length} photo(s) jointe(s)</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="sticky bottom-0 bg-background border-t p-4">
        <div className="max-w-lg mx-auto">
          {/* Secondary actions */}
          <div className="flex items-center justify-between mb-3">
            <AddPhotoButton 
              onPhotoAdded={(url) => onAddPhoto(currentNode.id, url)} 
            />
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowSuggestionDialog(true)}
              className="text-xs gap-1"
            >
              <HelpCircle className="h-4 w-4" />
              Question manquante ?
            </Button>
          </div>

          {/* Main navigation */}
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={onBack}
              disabled={!canGoBack}
              className="flex-1 h-12"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <Button 
              onClick={handleNext}
              disabled={!canProceed() && currentNode.type !== 'info'}
              className="flex-1 h-12"
            >
              {currentNode.isEnd ? 'Terminer' : 'Suivant'}
              {!currentNode.isEnd && <ArrowRight className="h-4 w-4 ml-2" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Missing question dialog */}
      <MissingQuestionDialog
        open={showSuggestionDialog}
        onOpenChange={setShowSuggestionDialog}
        nodeId={currentNode.id}
        univers={runnerState.breadcrumb[0]}
        branch={currentNode.branch || ''}
        onSubmit={(data) => {
          onSubmitSuggestion(data);
          setShowSuggestionDialog(false);
        }}
      />
    </div>
  );
}

// Boolean input (Oui / Non)
function BooleanInput({ value, onChange }: { value: any; onChange: (v: boolean) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Button
        variant={value === true ? 'default' : 'outline'}
        className="h-14 text-base"
        onClick={() => onChange(true)}
      >
        Oui
      </Button>
      <Button
        variant={value === false ? 'default' : 'outline'}
        className="h-14 text-base"
        onClick={() => onChange(false)}
      >
        Non
      </Button>
    </div>
  );
}

// Single choice input
function SingleChoiceInput({ 
  options, 
  value, 
  onChange 
}: { 
  options: { value: string; label: string }[]; 
  value: any; 
  onChange: (v: string) => void 
}) {
  return (
    <div className="space-y-2">
      {options.map((option) => (
        <Button
          key={option.value}
          variant={value === option.value ? 'default' : 'outline'}
          className={cn(
            "w-full h-auto min-h-[48px] justify-start text-left whitespace-normal px-4 py-3",
            value === option.value && "ring-2 ring-primary"
          )}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

// Multi choice input
function MultiChoiceInput({ 
  options, 
  value, 
  onChange 
}: { 
  options: { value: string; label: string }[]; 
  value: string[]; 
  onChange: (v: string[]) => void 
}) {
  const toggleOption = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter(v => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  return (
    <div className="space-y-2">
      {options.map((option) => {
        const isSelected = value.includes(option.value);
        return (
          <Button
            key={option.value}
            variant={isSelected ? 'default' : 'outline'}
            className={cn(
              "w-full h-auto min-h-[48px] justify-start text-left whitespace-normal px-4 py-3",
              isSelected && "ring-2 ring-primary"
            )}
            onClick={() => toggleOption(option.value)}
          >
            <span className={cn(
              "w-5 h-5 rounded border mr-3 flex items-center justify-center flex-shrink-0",
              isSelected ? "bg-primary-foreground border-primary-foreground" : "border-muted-foreground"
            )}>
              {isSelected && <Check className="h-3 w-3" />}
            </span>
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}

export default RtQuestionRunner;
