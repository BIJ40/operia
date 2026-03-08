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
  // Run after DOM is ready
  requestIdleCallback?.(() => {
    verifySecurityHeaders();
    auditExposedSecrets();
  }) ?? setTimeout(() => {
    verifySecurityHeaders();
    auditExposedSecrets();
  }, 2000);
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

createRoot(document.getElementById("root")!).render(<App />);
