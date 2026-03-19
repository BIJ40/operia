import React from 'react';
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import 'mapbox-gl/dist/mapbox-gl.css';
import { initSentry } from "./lib/sentry";
import { verifySecurityHeaders, auditExposedSecrets } from "./lib/observability/security-headers-check";

// Initialize Sentry before rendering
initSentry();

// Dev-only: security headers & secrets audit
if (import.meta.env.DEV) {
  const run = () => {
    verifySecurityHeaders();
    auditExposedSecrets();
  };
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(run);
  } else {
    setTimeout(run, 2000);
  }
}

// Preview: mémorise le token de session pour pouvoir l'utiliser lors d'ouvertures en nouvel onglet
// même si certaines navigations internes ont perdu la query string.
try {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("__lovable_token");
  if (token) {
    sessionStorage.setItem("__lovable_token", token);
    localStorage.setItem("__lovable_token", token);
  }
} catch {
  // ignore
}

// Safe SW registration — disabled in Lovable preview and sandboxed frames
const isLovablePreview = () => {
  try {
    return window.location.hostname.startsWith('id-preview--') || window.self !== window.top;
  } catch {
    return window.location.hostname.startsWith('id-preview--');
  }
};

const clearPreviewRuntimeCaches = async () => {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    }
  } catch {
    // ignore preview cleanup failures
  }
};

const canRegisterSW = () => {
  try {
    return !!navigator.serviceWorker && window.isSecureContext && !isLovablePreview();
  } catch {
    return false;
  }
};

if (isLovablePreview()) {
  void clearPreviewRuntimeCaches();
}

if (canRegisterSW()) {
  // @ts-ignore - virtual module provided by vite-plugin-pwa
  import('virtual:pwa-register').then(({ registerSW }: any) => {
    let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined;

    updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        void updateSW?.(true);
      },
      onRegisteredSW(_swUrl: string, registration: ServiceWorkerRegistration | undefined) {
        void registration?.update();
      },
    });
  }).catch(() => {
    // SW registration not available
  });
}

// Suppress any remaining SW-related SecurityErrors
window.addEventListener('unhandledrejection', (e) => {
  if (e.reason?.message?.includes('insecure') || e.reason?.name === 'SecurityError') {
    e.preventDefault();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
