import { useEffect, useRef } from 'react';
import { APP_VERSION } from '@/config/version';
import { logInfo, logWarn } from '@/lib/logger';

export const VERSION_CHECK_KEY = 'hc_last_version_check';
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes minimum between checks
export const FORCE_UPDATE_SESSION_KEY = 'hc_force_update_in_progress';

interface VersionInfo {
  version: string;
  buildTime: string;
}

function isLovablePreview() {
  try {
    return window.location.hostname.startsWith('id-preview--') || window.self !== window.top;
  } catch {
    return window.location.hostname.startsWith('id-preview--');
  }
}

/**
 * Hook that checks for app updates on startup and periodically.
 * If a new version is detected, it clears the service worker cache
 * and forces a page reload transparently.
 */
export function useVersionCheck() {
  const hasChecked = useRef(false);

  useEffect(() => {
    if (hasChecked.current) return;
    hasChecked.current = true;

    const previewMode = isLovablePreview();

    const checkVersion = async () => {
      try {
        // Rate limit checks in normal app runtime, but NEVER in Lovable preview.
        if (!previewMode) {
          const lastCheck = localStorage.getItem(VERSION_CHECK_KEY);
          const now = Date.now();

          if (lastCheck && now - parseInt(lastCheck, 10) < CHECK_INTERVAL_MS) {
            return;
          }

          localStorage.setItem(VERSION_CHECK_KEY, now.toString());
        }

        const response = await fetch(`/version.json?t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        });

        if (!response.ok) {
          logWarn('[VERSION] Failed to fetch version.json');
          return;
        }

        const serverVersion: VersionInfo = await response.json();

        if (serverVersion.version !== APP_VERSION) {
          // Guard against loops in regular runtime only.
          if (!previewMode) {
            try {
              const inProgress = sessionStorage.getItem(FORCE_UPDATE_SESSION_KEY);
              if (inProgress) {
                logWarn(`[VERSION] Update already attempted in this tab session (since ${inProgress}). Skipping forceUpdate to avoid reload loop.`);
                return;
              }
            } catch {
              // ignore
            }
          }

          logInfo(`[VERSION] Update detected: ${APP_VERSION} → ${serverVersion.version}`);
          await forceUpdate();
        } else {
          try {
            sessionStorage.removeItem(FORCE_UPDATE_SESSION_KEY);
          } catch {
            // ignore
          }
          logInfo(`[VERSION] App is up to date (${APP_VERSION})`);
        }
      } catch (error) {
        logWarn('[VERSION] Version check failed:', error);
      }
    };

    checkVersion();

    const interval = setInterval(checkVersion, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);
}

/**
 * Clears all caches and forces a hard reload
 */
async function forceUpdate(): Promise<void> {
  logInfo('[VERSION] Forcing update...');

  try {
    try {
      sessionStorage.setItem(FORCE_UPDATE_SESSION_KEY, String(Date.now()));
    } catch {
      // ignore
    }

    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => reg.unregister()));
      logInfo('[VERSION] Service workers unregistered');
    }

    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      logInfo('[VERSION] Caches cleared');
    }

    window.location.reload();
  } catch (error) {
    logWarn('[VERSION] Force update failed, attempting basic reload:', error);
    window.location.reload();
  }
}

/**
 * Manually trigger a version check and update
 * Useful for admin tools
 */
export async function checkForUpdates(): Promise<{ hasUpdate: boolean; currentVersion: string; serverVersion: string }> {
  const response = await fetch(`/version.json?t=${Date.now()}`, {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache' },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch version');
  }

  const serverVersion: VersionInfo = await response.json();

  return {
    hasUpdate: serverVersion.version !== APP_VERSION,
    currentVersion: APP_VERSION,
    serverVersion: serverVersion.version,
  };
}

/**
 * Force clear cache and reload (for admin/debug use)
 */
export async function forceRefresh(): Promise<void> {
  await forceUpdate();
}
