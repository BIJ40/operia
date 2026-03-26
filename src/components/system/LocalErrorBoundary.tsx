/**
 * LocalErrorBoundary - ErrorBoundary réutilisable pour isoler les erreurs par composant
 * Usage: Wrapper autour des composants critiques (Chatbot, Apogée Dashboard, etc.)
 */

import { Component, ReactNode, ErrorInfo } from "react";
import * as Sentry from "@sentry/react";
import { logError } from "@/lib/logger";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  componentName: string;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class LocalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const correlationId = crypto.randomUUID();

    Sentry.captureException(error, {
      tags: {
        type: "local-boundary",
        component: this.props.componentName,
      },
      extra: {
        componentStack: errorInfo.componentStack,
        correlationId,
      },
    });

    logError(`[${this.props.componentName}] Error:`, error);
    console.error(`[LocalErrorBoundary][${this.props.componentName}] Stack:`, error?.stack);
    console.error(`[LocalErrorBoundary][${this.props.componentName}] Component stack:`, errorInfo.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 bg-background border border-destructive/20 rounded-lg">
          <AlertCircle className="w-12 h-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Erreur dans {this.props.componentName}
          </h3>
          <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
            Une erreur est survenue lors du chargement de ce composant. 
            Nos équipes ont été notifiées.
          </p>
          {this.state.error && (
            <pre className="text-xs bg-muted p-2 rounded mb-4 max-w-md overflow-x-auto">
              {this.state.error.message}
            </pre>
          )}
          <Button onClick={this.handleReset} variant="outline">
            Réessayer
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
