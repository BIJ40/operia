/**
 * Security Logging Helper — Edge Functions
 * 
 * Lightweight, non-blocking security event logger.
 * Logs to console with structured format for observability.
 * 
 * Usage:
 *   import { secLog } from '../_shared/securityLog.ts';
 *   secLog.denied('generate-report', userId, 'Insufficient role', { required: 'N4', actual: 'N1' });
 *   secLog.suspicious('proxy-apogee', null, 'Missing agency_id in request');
 */

export type SecurityEventLevel = 'info' | 'warn' | 'error';

export interface SecurityEvent {
  level: SecurityEventLevel;
  type: 'access_denied' | 'auth_failure' | 'suspicious' | 'cron_rejected' | 'role_mismatch' | 'audit';
  functionName: string;
  userId: string | null;
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

function emit(event: SecurityEvent): void {
  const prefix = `[SEC:${event.type}:${event.functionName}]`;
  const msg = `${prefix} ${event.message} user=${event.userId ?? 'anonymous'}`;
  
  switch (event.level) {
    case 'error':
      console.error(msg, event.metadata ? JSON.stringify(event.metadata) : '');
      break;
    case 'warn':
      console.warn(msg, event.metadata ? JSON.stringify(event.metadata) : '');
      break;
    default:
      console.log(msg, event.metadata ? JSON.stringify(event.metadata) : '');
  }
}

export const secLog = {
  /** Access denied — user tried something they shouldn't */
  denied(functionName: string, userId: string | null, message: string, metadata?: Record<string, unknown>): void {
    emit({ level: 'warn', type: 'access_denied', functionName, userId, message, metadata, timestamp: new Date().toISOString() });
  },

  /** Authentication failure — invalid token, expired, etc. */
  authFailure(functionName: string, message: string, metadata?: Record<string, unknown>): void {
    emit({ level: 'warn', type: 'auth_failure', functionName, userId: null, message, metadata, timestamp: new Date().toISOString() });
  },

  /** Suspicious activity — unexpected patterns */
  suspicious(functionName: string, userId: string | null, message: string, metadata?: Record<string, unknown>): void {
    emit({ level: 'error', type: 'suspicious', functionName, userId, message, metadata, timestamp: new Date().toISOString() });
  },

  /** CRON job rejected — invalid or missing secret */
  cronRejected(functionName: string, metadata?: Record<string, unknown>): void {
    emit({ level: 'error', type: 'cron_rejected', functionName, userId: null, message: 'CRON secret validation failed', metadata, timestamp: new Date().toISOString() });
  },

  /** Role mismatch — frontend/backend inconsistency */
  roleMismatch(functionName: string, userId: string, message: string, metadata?: Record<string, unknown>): void {
    emit({ level: 'warn', type: 'role_mismatch', functionName, userId, message, metadata, timestamp: new Date().toISOString() });
  },

  /** General audit event */
  audit(functionName: string, userId: string | null, message: string, metadata?: Record<string, unknown>): void {
    emit({ level: 'info', type: 'audit', functionName, userId, message, metadata, timestamp: new Date().toISOString() });
  },
};
