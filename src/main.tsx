import React from 'react';
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import 'mapbox-gl/dist/mapbox-gl.css';
import { initSentry } from "./lib/sentry";

// Initialize Sentry before rendering
initSentry();

createRoot(document.getElementById("root")!).render(<App />);
