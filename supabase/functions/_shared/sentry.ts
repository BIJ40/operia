// Sentry integration for Supabase Edge Functions
// Lightweight implementation for Deno runtime

const SENTRY_DSN = Deno.env.get('SENTRY_DSN');
const SENTRY_ENV = Deno.env.get('SENTRY_ENV') || 'production';

interface SentryContext {
  function?: string;
  userId?: string;
  userEmail?: string;
  globalRole?: string;
  agencySlug?: string;
  [key: string]: unknown;
}

interface SentryEvent {
  event_id: string;
  timestamp: string;
  platform: string;
  level: string;
  logger: string;
  server_name: string;
  environment: string;
  exception: {
    values: Array<{
      type: string;
      value: string;
      stacktrace?: {
        frames: Array<{
          filename: string;
          function: string;
          lineno?: number;
        }>;
      };
    }>;
  };
  tags: Record<string, string>;
  extra: Record<string, unknown>;
  user?: {
    id?: string;
    email?: string;
  };
}

function generateEventId(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

function parseDSN(dsn: string): { publicKey: string; projectId: string; host: string } | null {
  try {
    const url = new URL(dsn);
    const publicKey = url.username;
    const projectId = url.pathname.replace('/', '');
    const host = url.host;
    return { publicKey, projectId, host };
  } catch {
    return null;
  }
}

function parseStackTrace(error: Error): Array<{ filename: string; function: string; lineno?: number }> {
  const stack = error.stack || '';
  const frames: Array<{ filename: string; function: string; lineno?: number }> = [];
  
  const lines = stack.split('\n').slice(1); // Skip error message line
  for (const line of lines) {
    const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):\d+\)/);
    if (match) {
      frames.push({
        function: match[1],
        filename: match[2],
        lineno: parseInt(match[3], 10),
      });
    }
  }
  
  return frames.reverse(); // Sentry expects oldest frame first
}

async function sendToSentry(event: SentryEvent): Promise<boolean> {
  if (!SENTRY_DSN) {
    console.warn('[Sentry Edge] DSN not configured - error not reported');
    return false;
  }

  const parsed = parseDSN(SENTRY_DSN);
  if (!parsed) {
    console.error('[Sentry Edge] Invalid DSN format');
    return false;
  }

  const { publicKey, projectId, host } = parsed;
  const sentryUrl = `https://${host}/api/${projectId}/store/`;

  try {
    const response = await fetch(sentryUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_client=edge-function/1.0.0, sentry_key=${publicKey}`,
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      console.error(`[Sentry Edge] Failed to send: ${response.status}`);
      return false;
    }

    console.info(`[Sentry Edge] Event sent: ${event.event_id}`);
    return true;
  } catch (err) {
    console.error('[Sentry Edge] Network error:', err);
    return false;
  }
}

/**
 * Capture and report an exception to Sentry from an Edge Function
 */
export async function captureEdgeException(
  error: Error | unknown,
  context: SentryContext = {}
): Promise<string | null> {
  const err = error instanceof Error ? error : new Error(String(error));
  
  const eventId = generateEventId();
  const timestamp = new Date().toISOString();

  const event: SentryEvent = {
    event_id: eventId,
    timestamp,
    platform: 'node', // Closest to Deno for Sentry
    level: 'error',
    logger: 'edge-function',
    server_name: 'supabase-edge',
    environment: SENTRY_ENV,
    exception: {
      values: [
        {
          type: err.name,
          value: err.message,
          stacktrace: {
            frames: parseStackTrace(err),
          },
        },
      ],
    },
    tags: {
      runtime: 'deno',
      function: context.function || 'unknown',
      env: SENTRY_ENV,
    },
    extra: {
      ...context,
      deno_version: Deno.version?.deno || 'unknown',
    },
  };

  // Add user context if available
  if (context.userId || context.userEmail) {
    event.user = {
      id: context.userId,
      email: context.userEmail,
    };
  }

  // Add custom tags
  if (context.globalRole) {
    event.tags.global_role = context.globalRole;
  }
  if (context.agencySlug) {
    event.tags.agency_slug = context.agencySlug;
  }

  const success = await sendToSentry(event);
  return success ? eventId : null;
}

/**
 * Capture a simple message to Sentry
 */
export async function captureEdgeMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context: SentryContext = {}
): Promise<string | null> {
  const eventId = generateEventId();
  const timestamp = new Date().toISOString();

  const event: SentryEvent = {
    event_id: eventId,
    timestamp,
    platform: 'node',
    level,
    logger: 'edge-function',
    server_name: 'supabase-edge',
    environment: SENTRY_ENV,
    exception: {
      values: [
        {
          type: 'Message',
          value: message,
        },
      ],
    },
    tags: {
      runtime: 'deno',
      function: context.function || 'unknown',
      env: SENTRY_ENV,
    },
    extra: context,
  };

  if (context.userId) {
    event.user = { id: context.userId };
  }

  const success = await sendToSentry(event);
  return success ? eventId : null;
}
