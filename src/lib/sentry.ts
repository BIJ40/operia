import * as Sentry from "@sentry/react";
import { logWarn, logInfo } from "@/lib/logger";

// Sentry DSN from environment variable
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

// Determine environment
function getEnvironment(): string {
  if (import.meta.env.DEV) return "development";
  if (window.location.hostname.includes("preview")) return "preview";
  if (window.location.hostname.includes("lovable")) return "staging";
  return "production";
}

// Initialize Sentry
export function initSentry() {
  if (!SENTRY_DSN) {
    logWarn('SENTRY', 'DSN not configured - error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: getEnvironment(),
    
    // CRITICAL: Disable all default integrations that show intrusive popups
    // This prevents the "An internal error occurred" popup with "Get help / Dismiss" buttons
    integrations: (integrations) => 
      integrations.filter((integration) => {
        // Remove feedback integrations that cause intrusive popups
        const name = integration.name.toLowerCase();
        return !name.includes('feedback') && 
               !name.includes('crashreport') &&
               !name.includes('reportdialog');
      }),
    
    // Filter out noisy errors
    beforeSend(event, hint) {
      const error = hint.originalException;
      
      // Filter network errors that are expected
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        
        // Ignore chunk load errors (network issues during code splitting)
        if (message.includes("chunkloaderror") || message.includes("loading chunk")) {
          return null;
        }
        
        // Ignore common network errors
        if (message.includes("failed to fetch") || message.includes("network error")) {
          return null;
        }
        
        // Ignore ResizeObserver errors (browser quirk)
        if (message.includes("resizeobserver")) {
          return null;
        }
      }
      
      return event;
    },
    
    // Enable in preview and production, disable in local dev unless debug flag is set
    enabled: !import.meta.env.DEV || 
             window.location.hostname.includes("lovableproject.com") ||
             window.location.hostname.includes("lovable.app") ||
             import.meta.env.VITE_SENTRY_DEBUG === "true",
    
    // Sample rate for error events (100% by default)
    sampleRate: 1.0,
  });

  logInfo('SENTRY', `Initialized for ${getEnvironment()}`);
}

// Set user context when authenticated
export function setSentryUser(user: {
  id: string;
  email?: string | null;
  globalRole?: string | null;
  agencySlug?: string | null;
}) {
  Sentry.setUser({
    id: user.id,
    email: user.email || undefined,
  });
  
  Sentry.setContext("user_profile", {
    global_role: user.globalRole,
    agency_slug: user.agencySlug,
  });
}

// Clear user context on logout
export function clearSentryUser() {
  Sentry.setUser(null);
}

// Capture exception with additional context
export function captureException(
  error: Error,
  context?: Record<string, unknown>
) {
  Sentry.captureException(error, {
    extra: context,
  });
}

// Capture message with level
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = "info"
) {
  Sentry.captureMessage(message, level);
}

// Add breadcrumb for debugging
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>
) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: "info",
  });
}
