import { AlertTriangle, XCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { FlowValidationError } from '@/lib/flow/flowTypes';

interface FlowValidationPanelProps {
  errors: FlowValidationError[];
  onDismiss: () => void;
}

export function FlowValidationPanel({ errors, onDismiss }: FlowValidationPanelProps) {
  const errorCount = errors.filter(e => e.type === 'error').length;
  const warningCount = errors.filter(e => e.type === 'warning').length;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted">
        <div className="flex items-center gap-3 text-sm">
          <span className="font-medium">Validation</span>
          {errorCount > 0 && (
            <span className="flex items-center gap-1 text-destructive">
              <XCircle className="h-4 w-4" />
              {errorCount} erreur(s)
            </span>
          )}
          {warningCount > 0 && (
            <span className="flex items-center gap-1 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              {warningCount} avertissement(s)
            </span>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDismiss}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="max-h-32">
        <div className="p-2 space-y-1">
          {errors.map((error, index) => (
            <div
              key={index}
              className={cn(
                'flex items-start gap-2 p-2 rounded text-sm',
                error.type === 'error' 
                  ? 'bg-destructive/10 text-destructive' 
                  : 'bg-amber-500/10 text-amber-700'
              )}
            >
              {error.type === 'error' ? (
                <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              )}
              <span>{error.message}</span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
