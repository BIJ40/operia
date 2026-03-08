/**
 * Observability Module — Structured Logging for Operia
 * 
 * Provides structured, context-rich logging that replaces raw console.log.
 * Each log entry includes timestamp, module, userId, agencyId, and optional requestId.
 * 
 * In production, only warn/error are emitted. In dev, all levels are active.
 * Errors are forwarded to Sentry when configured.
 */

import * as Sentry from "@sentry/react";

// ============================================================================
// Types
// ============================================================================

export interface LogContext {
  module: string;
  userId?: string | null;
  agencyId?: string | null;
  requestId?: string;
  [key: string]: unknown;
}

interface StructuredLogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  module: string;
  message: string;
  userId?: string | null;
  agencyId?: string | null;
  requestId?: string;
  data?: unknown;
}

// ============================================================================
// Config
// ============================================================================

const isDev = import.meta.env.DEV;
const debugEnabled = import.meta.env.VITE_DEBUG_LOGS === 'true';
const canDebug = isDev || debugEnabled;
const IS_SENTRY_ENABLED = !!import.meta.env.VITE_SENTRY_DSN;

// ============================================================================
// Core logger
// ============================================================================

function buildEntry(
  level: StructuredLogEntry['level'],
  ctx: LogContext,
  message: string,
  data?: unknown
): StructuredLogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    module: ctx.module,
    message,
    userId: ctx.userId ?? undefined,
    agencyId: ctx.agencyId ?? undefined,
    requestId: ctx.requestId,
    data,
  };
}

function emit(entry: StructuredLogEntry) {
  const prefix = `[${entry.level.toUpperCase()}][${entry.module}]`;
  const meta = [
    entry.userId && `user=${entry.userId}`,
    entry.agencyId && `agency=${entry.agencyId}`,
    entry.requestId && `req=${entry.requestId}`,
  ].filter(Boolean).join(' ');

  const tag = meta ? `${prefix}(${meta})` : prefix;

  switch (entry.level) {
    case 'debug':
      if (canDebug) console.log(tag, entry.message, entry.data ?? '');
      break;
    case 'info':
      if (canDebug) console.info(tag, entry.message, entry.data ?? '');
      break;
    case 'warn':
      console.warn(tag, entry.message, entry.data ?? '');
      break;
    case 'error':
      console.error(tag, entry.message, entry.data ?? '');
      reportToSentry(entry);
      break;
  }
}

function reportToSentry(entry: StructuredLogEntry) {
  if (!IS_SENTRY_ENABLED) return;
  try {
    if (entry.data instanceof Error) {
      Sentry.captureException(entry.data, {
        tags: { module: entry.module },
        extra: { message: entry.message, userId: entry.userId, agencyId: entry.agencyId },
      });
    } else {
      Sentry.captureMessage(entry.message, {
        level: 'error',
        tags: { module: entry.module },
        extra: { data: entry.data, userId: entry.userId, agencyId: entry.agencyId },
      });
    }
  } catch {
    // Never crash the app due to Sentry
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Creates a scoped structured logger for a specific module.
 * 
 * @example
 * const log = createLogger({ module: 'tickets', userId: user.id, agencyId });
 * log.info('Ticket created', { ticketId: '123' });
 * log.error('Failed to save', error);
 */
export function createLogger(ctx: LogContext) {
  return {
    debug: (message: string, data?: unknown) => emit(buildEntry('debug', ctx, message, data)),
    info: (message: string, data?: unknown) => emit(buildEntry('info', ctx, message, data)),
    warn: (message: string, data?: unknown) => emit(buildEntry('warn', ctx, message, data)),
    error: (message: string, data?: unknown) => emit(buildEntry('error', ctx, message, data)),
  };
}

/**
 * Quick one-off structured log (no pre-bound context).
 */
export const structuredLog = {
  debug: (module: string, message: string, data?: unknown) =>
    emit(buildEntry('debug', { module }, message, data)),
  info: (module: string, message: string, data?: unknown) =>
    emit(buildEntry('info', { module }, message, data)),
  warn: (module: string, message: string, data?: unknown) =>
    emit(buildEntry('warn', { module }, message, data)),
  error: (module: string, message: string, data?: unknown) =>
    emit(buildEntry('error', { module }, message, data)),
};
