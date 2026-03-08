/**
 * Security Headers Verification — Self-host hardening
 * 
 * Checks that critical security headers are present on the current page.
 * Runs in dev mode only. Logs warnings for missing protections.
 */

import { createLogger } from './index';

const log = createLogger({ module: 'security-headers' });

interface HeaderCheck {
  name: string;
  /** Check via meta tag or response header */
  metaEquiv?: string;
  expected?: string;
  description: string;
}

const REQUIRED_HEADERS: HeaderCheck[] = [
  {
    name: 'Content-Security-Policy',
    metaEquiv: 'Content-Security-Policy',
    description: 'Prevents XSS and injection attacks',
  },
  {
    name: 'X-Content-Type-Options',
    description: 'Prevents MIME-type sniffing (should be "nosniff")',
  },
  {
    name: 'X-Frame-Options',
    description: 'Prevents clickjacking (should be "DENY" or "SAMEORIGIN")',
  },
];

/**
 * Verifies security headers on the current page (meta tags).
 * Only runs in development mode.
 */
export function verifySecurityHeaders(): void {
  if (!import.meta.env.DEV) return;

  const metas = document.querySelectorAll('meta[http-equiv]');
  const metaMap = new Map<string, string>();

  metas.forEach((meta) => {
    const equiv = meta.getAttribute('http-equiv');
    const content = meta.getAttribute('content');
    if (equiv && content) {
      metaMap.set(equiv.toLowerCase(), content);
    }
  });

  const results: { header: string; status: 'ok' | 'missing'; description: string }[] = [];

  for (const check of REQUIRED_HEADERS) {
    const key = (check.metaEquiv ?? check.name).toLowerCase();
    const found = metaMap.has(key);

    results.push({
      header: check.name,
      status: found ? 'ok' : 'missing',
      description: check.description,
    });

    if (!found) {
      log.warn(`Missing security header: ${check.name}`, { description: check.description });
    }
  }

  // Check for unsafe-eval in CSP
  const csp = metaMap.get('content-security-policy');
  if (csp && csp.includes("'unsafe-eval'")) {
    log.warn('CSP contains unsafe-eval — potential XSS vector');
  }

  log.debug('Security headers check complete', { results });
}

/**
 * Verifies no secrets are leaked in the frontend bundle.
 * Checks window/global scope for known secret patterns.
 */
export function auditExposedSecrets(): void {
  if (!import.meta.env.DEV) return;

  const dangerousPatterns = [
    { key: 'SUPABASE_SERVICE_ROLE_KEY', pattern: /service_role/ },
    { key: 'SUPABASE_DB_PASSWORD', pattern: /postgres:\/\// },
    { key: 'PRIVATE_KEY', pattern: /-----BEGIN (RSA )?PRIVATE KEY-----/ },
  ];

  // Check env vars exposed to frontend
  const envKeys = Object.keys(import.meta.env);
  const suspicious = envKeys.filter(
    (k) => !k.startsWith('VITE_') && !['DEV', 'PROD', 'SSR', 'MODE', 'BASE_URL'].includes(k)
  );

  if (suspicious.length > 0) {
    log.warn('Non-VITE_ env vars exposed to frontend', { keys: suspicious });
  }

  // Check for service role key in common locations
  for (const { key, pattern } of dangerousPatterns) {
    const envValue = import.meta.env[`VITE_${key}`];
    if (envValue) {
      log.error(`CRITICAL: ${key} is exposed via VITE_ prefix in frontend bundle!`);
    }

    // Check localStorage/sessionStorage
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const storageKey = localStorage.key(i);
        const value = storageKey ? localStorage.getItem(storageKey) : null;
        if (value && pattern.test(value)) {
          log.warn(`Possible secret in localStorage key: ${storageKey}`, { pattern: key });
        }
      }
    } catch {
      // Storage access may fail in some contexts
    }
  }

  log.debug('Secrets audit complete');
}
