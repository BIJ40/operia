/**
 * Toast Helpers - Utilitaires pour afficher des toasts standardisés
 * Avec support des erreurs structurées et correlationId
 */

import { toast } from "sonner";

interface ErrorWithCorrelation {
  code?: string;
  message: string;
  correlationId?: string;
}

/**
 * Affiche un toast d'erreur avec référence technique
 */
export function errorToast(error: ErrorWithCorrelation | string) {
  if (typeof error === "string") {
    toast.error(error);
    return;
  }

  const message = error.message || "Une erreur est survenue.";
  const correlationId = error.correlationId;

  if (correlationId) {
    toast.error(message, {
      description: `Réf: ${correlationId.slice(0, 8)}...`,
    });
  } else {
    toast.error(message);
  }
}

/**
 * Affiche un toast de succès
 */
export function successToast(message: string, description?: string) {
  toast.success(message, { description });
}

/**
 * Affiche un toast d'avertissement
 */
export function warningToast(message: string, description?: string) {
  toast.warning(message, { description });
}

/**
 * Affiche un toast d'information
 */
export function infoToast(message: string, description?: string) {
  toast.info(message, { description });
}

/**
 * Affiche un toast de chargement avec promesse
 */
export function loadingToast<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string;
    error: string;
  }
) {
  return toast.promise(promise, messages);
}
