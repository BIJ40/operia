import { useEffect, useRef } from 'react';
import { APP_VERSION } from '@/config/version';
import { logInfo, logWarn } from '@/lib/logger';

const VERSION_CHECK_KEY = 'hc_last_version_check';
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes minimum between checks

interface VersionInfo {
  version: string;
  buildTime: string;
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

    const checkVersion = async () => {
      try {
        // Rate limit checks
        const lastCheck = localStorage.getItem(VERSION_CHECK_KEY);
        const now = Date.now();
        
        if (lastCheck && now - parseInt(lastCheck, 10) < CHECK_INTERVAL_MS) {
          return; // Too soon since last check
        }

        // Fetch version with cache-busting
        const response = await fetch(`/version.json?t=${now}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });

        if (!response.ok) {
          logWarn('[VERSION] Failed to fetch version.json');
          return;
        }

        const serverVersion: VersionInfo = await response.json();
        localStorage.setItem(VERSION_CHECK_KEY, now.toString());

        // Compare versions
        if (serverVersion.version !== APP_VERSION) {
          logInfo(`[VERSION] Update detected: ${APP_VERSION} → ${serverVersion.version}`);
          await forceUpdate();
        } else {
          logInfo(`[VERSION] App is up to date (${APP_VERSION})`);
        }
      } catch (error) {
        logWarn('[VERSION] Version check failed:', error);
      }
    };

    // Check on mount
    checkVersion();

    // Also check periodically while app is open
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
    // 1. Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => reg.unregister()));
      logInfo('[VERSION] Service workers unregistered');
    }

    // 2. Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      logInfo('[VERSION] Caches cleared');
    }

    // 3. Clear localStorage version marker to allow fresh check
    localStorage.removeItem(VERSION_CHECK_KEY);

    // 4. Force hard reload
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
  try {
    const response = await fetch(`/version.json?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch version');
    }

    const serverVersion: VersionInfo = await response.json();
    
    return {
      hasUpdate: serverVersion.version !== APP_VERSION,
      currentVersion: APP_VERSION,
      serverVersion: serverVersion.version
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Force clear cache and reload (for admin/debug use)
 */
export async function forceRefresh(): Promise<void> {
  await forceUpdate();
}
