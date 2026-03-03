/**
 * GlobalErrorBoundary - Intercepte toutes les erreurs React non catchées
 * Génère un correlationId, log dans Sentry, affiche ErrorLayer
 */

import { Component, ReactNode, ErrorInfo } from "react";
import * as Sentry from "@sentry/react";
import { ErrorLayer } from "./ErrorLayer";

interface Props {
  children: ReactNode;
  fallbackComponent?: ReactNode;
}

interface State {
  hasError: boolean;
  correlationId: string | null;
  errorCode: string | null;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      correlationId: null, 
      errorCode: null,
      error: null 
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const correlationId = crypto.randomUUID();
    const errorCode = "UI_RUNTIME_ERROR";

    // ALWAYS log to console for debugging (even if Sentry is not configured)
    console.error(`[GlobalErrorBoundary] ${errorCode} (${correlationId}):`, error);
    console.error(`[GlobalErrorBoundary] Component stack:`, errorInfo.componentStack);

    // Log to Sentry with full context
    Sentry.captureException(error, {
      tags: { 
        type: "react-boundary",
        errorCode 
      },
      extra: { 
        componentStack: errorInfo.componentStack,
        correlationId 
      },
    });

    this.setState({ 
      hasError: true, 
      correlationId, 
      errorCode,
      error 
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <ErrorLayer
            errorCode={this.state.errorCode || "UNKNOWN_ERROR"}
            message="Une erreur interne est survenue. L'équipe support a été notifiée."
            correlationId={this.state.correlationId || "N/A"}
            error={this.state.error || undefined}
          />
        </div>
      );
    }

    return this.props.children;
  }
}
