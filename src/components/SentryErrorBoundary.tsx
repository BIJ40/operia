import * as Sentry from "@sentry/react";
import { Button } from "@/components/ui/button";
import { clientNavigate } from "@/lib/clientNavigate";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface FallbackProps {
  error: Error;
  resetError: () => void;
}

function ErrorFallback({ error, resetError }: FallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-destructive/10">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">Une erreur est survenue</h1>
          <p className="text-muted-foreground">
            L'équipe support a été notifiée et travaille à résoudre le problème.
          </p>
        </div>

        {import.meta.env.DEV && (
          <div className="p-4 bg-muted rounded-lg text-left">
            <p className="text-sm font-mono text-destructive break-all">{error.message}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={resetError} variant="default">
            <RefreshCw className="h-4 w-4 mr-2" />
            Réessayer
          </Button>
          <Button onClick={() => clientNavigate("/")} variant="outline">
            Retour à l'accueil
          </Button>
        </div>
      </div>
    </div>
  );
}

interface SentryErrorBoundaryProps {
  children: React.ReactNode;
}

export function SentryErrorBoundary({ children }: SentryErrorBoundaryProps) {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <ErrorFallback
          error={error instanceof Error ? error : new Error(String(error))}
          resetError={resetError}
        />
      )}
      beforeCapture={(scope) => {
        scope.setTag("location", "error_boundary");
      }}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}

