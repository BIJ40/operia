/**
 * ErrorLayer - Composant d'affichage d'erreur standardisé
 * Affiche un bandeau d'erreur propre sans exposer la stack
 */

import * as Sentry from "@sentry/react";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface ErrorLayerProps {
  errorCode: string;
  message: string;
  correlationId: string;
  error?: Error;
}

export function ErrorLayer({ errorCode, message, correlationId, error }: ErrorLayerProps) {
  useEffect(() => {
    // Log to Sentry with correlation context
    if (error) {
      Sentry.captureException(error, {
        tags: {
          type: "error-layer",
          errorCode,
        },
        extra: {
          correlationId,
          message,
        },
      });
    }
  }, [error, errorCode, correlationId, message]);

  return (
    <div className="p-6 border-2 border-destructive bg-destructive/10 rounded-xl mt-6 max-w-xl mx-auto">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h2 className="text-lg font-bold text-destructive mb-2">Une erreur est survenue</h2>

          <p className="text-destructive/90 mb-3">{message}</p>

          <div className="text-xs text-destructive/70 bg-destructive/5 p-2 rounded font-mono">
            <p>
              Code technique : <strong>{errorCode}</strong>
            </p>
            <p>
              Référence : <strong>{correlationId}</strong>
            </p>
          </div>

          <div className="mt-4 flex gap-3">
            <Button variant="destructive" size="sm" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Recharger la page
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/">
                <Home className="h-4 w-4 mr-2" />
                Retour à l'accueil
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

