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

// Nettoyage agressif : désenregistrer tout SW résiduel et vider les caches au démarrage
const cleanupStaleCaches = async () => {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }
  } catch {
    // ignore
  }
};

// Toujours nettoyer les SW/caches résiduels de l'ancienne config PWA
void cleanupStaleCaches();

// Suppress any remaining SW-related SecurityErrors
window.addEventListener('unhandledrejection', (e) => {
  if (e.reason?.message?.includes('insecure') || e.reason?.name === 'SecurityError') {
    e.preventDefault();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
