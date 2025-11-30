import { useEffect, useState } from "react";
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
  Zap,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface HealthCheck {
  name: string;
  status: "healthy" | "degraded" | "error" | "checking";
  message: string;
  lastChecked?: Date;
  icon: React.ReactNode;
}

export default function AdminSystemHealth() {
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([
    { name: "Base de données", status: "checking", message: "Vérification...", icon: <Database className="h-5 w-5" /> },
    { name: "Authentification", status: "checking", message: "Vérification...", icon: <Shield className="h-5 w-5" /> },
    { name: "Edge Functions", status: "checking", message: "Vérification...", icon: <Zap className="h-5 w-5" /> },
  ]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const environment = import.meta.env.DEV 
    ? "development" 
    : window.location.hostname.includes("preview") 
      ? "preview" 
      : "production";

  useEffect(() => {
    runHealthChecks();
  }, []);

  async function runHealthChecks() {
    setIsRefreshing(true);
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
          icon: <Database className="h-5 w-5" />,
        });
      } else {
        checks.push({
          name: "Base de données",
          status: "healthy",
          message: `Connecté (${latency}ms)`,
          lastChecked: new Date(),
          icon: <Database className="h-5 w-5" />,
        });
      }
    } catch {
      checks.push({
        name: "Base de données",
        status: "error",
        message: "Connexion impossible",
        lastChecked: new Date(),
        icon: <Database className="h-5 w-5" />,
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
        icon: <Shield className="h-5 w-5" />,
      });
    } catch {
      checks.push({
        name: "Authentification",
        status: "error",
        message: "Service indisponible",
        lastChecked: new Date(),
        icon: <Shield className="h-5 w-5" />,
      });
    }

    // Check edge functions (simple ping)
    try {
      const start = Date.now();
      await supabase.functions.invoke("get-kpis", {
        body: { period: "day" },
      });
      const latency = Date.now() - start;
      
      checks.push({
        name: "Edge Functions",
        status: latency < 5000 ? "healthy" : "degraded",
        message: `Réponse en ${latency}ms`,
        lastChecked: new Date(),
        icon: <Zap className="h-5 w-5" />,
      });
    } catch {
      checks.push({
        name: "Edge Functions",
        status: "degraded",
        message: "Temps de réponse élevé",
        lastChecked: new Date(),
        icon: <Zap className="h-5 w-5" />,
      });
    }

    setHealthChecks(checks);
    setIsRefreshing(false);
  }

  const getStatusColor = (status: HealthCheck["status"]) => {
    switch (status) {
      case "healthy": return "text-green-500";
      case "degraded": return "text-yellow-500";
      case "error": return "text-destructive";
      default: return "text-muted-foreground";
    }
  };

  const getStatusBadge = (status: HealthCheck["status"]) => {
    switch (status) {
      case "healthy":
        return <Badge className="bg-green-500 hover:bg-green-600 text-white">Opérationnel</Badge>;
      case "degraded":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-black">Dégradé</Badge>;
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full border-2 border-helpconfort-blue/30 flex items-center justify-center bg-white/50">
            <Server className="w-5 h-5 text-helpconfort-blue" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">État des services</h2>
            <p className="text-sm text-muted-foreground">Surveillance en temps réel</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge(overallStatus)}
          <Badge variant="outline" className="text-xs">
            {environment}
          </Badge>
        </div>
      </div>

      {/* Health Check Tiles */}
      <div className="grid gap-4 md:grid-cols-3">
        {healthChecks.map((check) => (
          <div 
            key={check.name}
            className="group rounded-xl p-5 bg-gradient-to-r from-helpconfort-blue/10 via-helpconfort-blue/5 to-transparent border border-helpconfort-blue/20 border-l-4 border-l-helpconfort-blue shadow-sm transition-all duration-300 hover:from-helpconfort-blue/15 hover:via-helpconfort-blue/8 hover:border-helpconfort-blue/30 hover:shadow-lg"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">{check.name}</h3>
              <div className={`${getStatusColor(check.status)}`}>
                {check.status === "checking" ? (
                  <Activity className="h-5 w-5 animate-pulse" />
                ) : check.status === "healthy" ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <AlertTriangle className="h-5 w-5" />
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-helpconfort-blue/30 flex items-center justify-center bg-white/50 group-hover:border-helpconfort-blue group-hover:bg-white transition-all">
                <span className="text-helpconfort-blue">{check.icon}</span>
              </div>
              <p className="text-sm text-muted-foreground">{check.message}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={runHealthChecks}
          disabled={isRefreshing}
          className="border-helpconfort-blue/30 hover:bg-helpconfort-blue/10"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Info Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="group rounded-xl p-5 bg-gradient-to-r from-helpconfort-blue/10 via-helpconfort-blue/5 to-transparent border border-helpconfort-blue/20 border-l-4 border-l-helpconfort-blue shadow-sm transition-all duration-300 hover:from-helpconfort-blue/15 hover:via-helpconfort-blue/8 hover:border-helpconfort-blue/30 hover:shadow-lg">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-11 h-11 rounded-full border-2 border-helpconfort-blue/30 flex items-center justify-center bg-white/50 group-hover:border-helpconfort-blue group-hover:bg-white transition-all">
              <Shield className="w-5 h-5 text-helpconfort-blue" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Monitoring des erreurs</h3>
              <p className="text-sm text-muted-foreground">Configuration Sentry</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Frontend (React)</h4>
              <p className="text-sm text-muted-foreground">
                Toutes les erreurs JavaScript non gérées sont automatiquement 
                capturées avec le contexte utilisateur (ID, email, rôle, agence).
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Backend (Edge Functions)</h4>
              <p className="text-sm text-muted-foreground">
                Les erreurs dans les fonctions critiques sont reportées avec 
                le contexte de la requête.
              </p>
            </div>
            <div className="pt-3 border-t border-border/50">
              <a
                href="https://sentry.io"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-helpconfort-blue hover:underline font-medium"
              >
                Ouvrir le dashboard Sentry
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>

        <div className="group rounded-xl p-5 bg-gradient-to-r from-helpconfort-blue/10 via-helpconfort-blue/5 to-transparent border border-helpconfort-blue/20 border-l-4 border-l-helpconfort-blue shadow-sm transition-all duration-300 hover:from-helpconfort-blue/15 hover:via-helpconfort-blue/8 hover:border-helpconfort-blue/30 hover:shadow-lg">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-11 h-11 rounded-full border-2 border-helpconfort-blue/30 flex items-center justify-center bg-white/50 group-hover:border-helpconfort-blue group-hover:bg-white transition-all">
              <Zap className="w-5 h-5 text-helpconfort-blue" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">En cas d'incident</h3>
              <p className="text-sm text-muted-foreground">Procédure de gestion</p>
            </div>
          </div>
          <div className="space-y-3">
            {[
              "Consulter Sentry pour identifier l'erreur",
              "Analyser le contexte (utilisateur, agence, action)",
              "Reproduire le problème en environnement de dev",
              "Corriger, déployer et vérifier dans Sentry"
            ].map((step, index) => (
              <div key={index} className="flex gap-3 items-start">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-helpconfort-blue text-white flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </span>
                <p className="text-sm text-muted-foreground pt-0.5">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="group rounded-xl p-5 bg-gradient-to-r from-helpconfort-blue/10 via-helpconfort-blue/5 to-transparent border border-helpconfort-blue/20 border-l-4 border-l-helpconfort-blue shadow-sm transition-all duration-300 hover:from-helpconfort-blue/15 hover:via-helpconfort-blue/8 hover:border-helpconfort-blue/30 hover:shadow-lg">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-11 h-11 rounded-full border-2 border-helpconfort-blue/30 flex items-center justify-center bg-white/50 group-hover:border-helpconfort-blue group-hover:bg-white transition-all">
            <Database className="w-5 h-5 text-helpconfort-blue" />
          </div>
          <h3 className="font-semibold text-foreground">Informations système</h3>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Environnement</p>
            <p className="font-semibold text-foreground">{environment}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Projet ID</p>
            <p className="font-mono text-xs text-foreground truncate">
              {import.meta.env.VITE_SUPABASE_PROJECT_ID || "N/A"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Sentry</p>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="font-medium text-green-600">Configuré</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
