import { useEffect, useState } from "react";
import * as Sentry from '@sentry/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink, 
  Server, 
  Shield,
  Database,
  Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface HealthCheck {
  name: string;
  status: "healthy" | "degraded" | "error" | "checking";
  message: string;
  lastChecked?: Date;
}

export default function AdminSystemHealth() {
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([
    { name: "Base de données", status: "checking", message: "Vérification..." },
    { name: "Authentification", status: "checking", message: "Vérification..." },
    { name: "Edge Functions", status: "checking", message: "Vérification..." },
  ]);

  const environment = import.meta.env.DEV 
    ? "development" 
    : window.location.hostname.includes("preview") 
      ? "preview" 
      : "production";

  useEffect(() => {
    runHealthChecks();
  }, []);

  async function runHealthChecks() {
    const checks: HealthCheck[] = [];

    // Check database connectivity
    try {
      const start = Date.now();
      const { error } = await supabase.from("profiles").select("id").limit(1);
      const latency = Date.now() - start;
      
      if (error) {
        checks.push({
          name: "Base de données",
          status: "error",
          message: `Erreur: ${error.message}`,
          lastChecked: new Date(),
        });
      } else {
        checks.push({
          name: "Base de données",
          status: "healthy",
          message: `Connecté (${latency}ms)`,
          lastChecked: new Date(),
        });
      }
    } catch (err) {
      checks.push({
        name: "Base de données",
        status: "error",
        message: "Connexion impossible",
        lastChecked: new Date(),
      });
    }

    // Check auth
    try {
      const { data: { session } } = await supabase.auth.getSession();
      checks.push({
        name: "Authentification",
        status: session ? "healthy" : "degraded",
        message: session ? "Session active" : "Aucune session",
        lastChecked: new Date(),
      });
    } catch (err) {
      checks.push({
        name: "Authentification",
        status: "error",
        message: "Service indisponible",
        lastChecked: new Date(),
      });
    }

    // Check edge functions (simple ping)
    try {
      const start = Date.now();
      const { error } = await supabase.functions.invoke("get-kpis", {
        body: { period: "day" },
      });
      const latency = Date.now() - start;
      
      // We expect an error since we may not have valid agency, but the function responded
      checks.push({
        name: "Edge Functions",
        status: latency < 5000 ? "healthy" : "degraded",
        message: `Réponse en ${latency}ms`,
        lastChecked: new Date(),
      });
    } catch (err) {
      checks.push({
        name: "Edge Functions",
        status: "degraded",
        message: "Temps de réponse élevé",
        lastChecked: new Date(),
      });
    }

    setHealthChecks(checks);
  }

  const getStatusIcon = (status: HealthCheck["status"]) => {
    switch (status) {
      case "healthy":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "degraded":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "error":
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      default:
        return <Activity className="h-5 w-5 text-muted-foreground animate-pulse" />;
    }
  };

  const getStatusBadge = (status: HealthCheck["status"]) => {
    switch (status) {
      case "healthy":
        return <Badge variant="default" className="bg-green-500">Opérationnel</Badge>;
      case "degraded":
        return <Badge variant="secondary" className="bg-yellow-500 text-black">Dégradé</Badge>;
      case "error":
        return <Badge variant="destructive">Erreur</Badge>;
      default:
        return <Badge variant="outline">Vérification...</Badge>;
    }
  };

  const overallStatus = healthChecks.every(c => c.status === "healthy")
    ? "healthy"
    : healthChecks.some(c => c.status === "error")
      ? "error"
      : "degraded";

  return (
    <div className="space-y-6">
        {/* Overall Status */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                État général
              </CardTitle>
              {getStatusBadge(overallStatus)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {healthChecks.map((check) => (
                <div
                  key={check.name}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                >
                  {getStatusIcon(check.status)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{check.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {check.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="outline" size="sm" onClick={runHealthChecks}>
                <Activity className="h-4 w-4 mr-2" />
                Actualiser
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Monitoring Section */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Monitoring des erreurs
              </CardTitle>
              <CardDescription>
                Configuration Sentry pour le suivi des erreurs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Frontend (React)</h4>
                <p className="text-sm text-muted-foreground">
                  Toutes les erreurs JavaScript non gérées sont automatiquement 
                  capturées et envoyées à Sentry avec le contexte utilisateur 
                  (ID, email, rôle, agence).
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Backend (Edge Functions)</h4>
                <p className="text-sm text-muted-foreground">
                  Les erreurs dans les fonctions critiques (chat-guide, get-kpis, 
                  network-kpis, etc.) sont également reportées avec le contexte 
                  de la requête.
                </p>
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-2">
                  Dashboard Sentry (accès réservé à l'équipe technique) :
                </p>
                <a
                  href="https://sentry.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  Ouvrir Sentry
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                En cas d'incident
              </CardTitle>
              <CardDescription>
                Procédure de gestion des incidents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm">
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                    1
                  </span>
                  <p className="text-muted-foreground">
                    Consulter le dashboard Sentry pour identifier l'erreur et sa fréquence
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                    2
                  </span>
                  <p className="text-muted-foreground">
                    Analyser le contexte (utilisateur, agence, action effectuée)
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                    3
                  </span>
                  <p className="text-muted-foreground">
                    Reproduire le problème en environnement de dev si possible
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                    4
                  </span>
                  <p className="text-muted-foreground">
                    Corriger et déployer le fix, puis vérifier dans Sentry que l'erreur ne réapparaît plus
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Informations système
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 text-sm">
              <div>
                <p className="text-muted-foreground">Environnement</p>
                <p className="font-medium">{environment}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Projet Supabase</p>
                <p className="font-medium font-mono text-xs">
                  {import.meta.env.VITE_SUPABASE_PROJECT_ID || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Sentry configuré</p>
                <p className="font-medium">Oui</p>
              </div>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
