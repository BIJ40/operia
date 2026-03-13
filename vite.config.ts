import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  logLevel: "warn",
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      includeAssets: ["favicon.ico", "favicon.png", "logo-apogee.png"],
      manifest: false, // We use manual manifest.webmanifest
      workbox: {
        maximumFileSizeToCacheInBytes: 25 * 1024 * 1024, // 25 MB limit
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/, /^\/supabase/],
        runtimeCaching: [
          {
            // Cache-first for static assets
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "images-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
          {
            // Cache-first for fonts
            urlPattern: /\.(?:woff|woff2|ttf|eot)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "fonts-cache",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
              },
            },
          },
          {
            // Stale-while-revalidate for /t routes (app shell)
            urlPattern: /^\/t/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "technician-shell",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
              },
            },
          },
          {
            // Network-first for API calls with short timeout
            urlPattern: /\/rest\/v1\//,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 5 * 60, // 5 minutes
              },
            },
          },
          {
            // Network-first for edge functions
            urlPattern: /\/functions\/v1\//,
            handler: "NetworkFirst",
            options: {
              cacheName: "functions-cache",
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60, // 1 minute
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false, // Disable in dev to avoid issues
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "esnext",
    reportCompressedSize: false,
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext",
    },
    exclude: ["pdfjs-dist"],
  },
}));

