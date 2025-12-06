/**
 * Helpi Config Tab - Configuration du moteur
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Settings, Database, Zap, Shield } from "lucide-react";

export function HelpiConfigTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Configuration actuelle</CardTitle>
              <CardDescription>
                Paramètres du moteur de recherche Helpi
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Embedding Model */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <Label className="font-medium">Modèle d'embedding</Label>
            </div>
            <div className="pl-6 space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">text-embedding-3-small</Badge>
                <span className="text-sm text-muted-foreground">OpenAI</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Dimension: 1536 | Modèle optimisé pour la recherche sémantique
              </p>
            </div>
          </div>

          {/* Search Parameters */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <Label className="font-medium">Paramètres de recherche</Label>
            </div>
            <div className="pl-6 grid gap-3 sm:grid-cols-2">
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-sm font-medium">Seuil de similarité</div>
                <div className="text-2xl font-bold text-primary">0.30</div>
                <p className="text-xs text-muted-foreground">
                  Score minimum pour inclure un résultat
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-sm font-medium">Résultats max</div>
                <div className="text-2xl font-bold text-primary">8</div>
                <p className="text-xs text-muted-foreground">
                  Nombre de chunks retournés par défaut
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-sm font-medium">Taille chunk</div>
                <div className="text-2xl font-bold text-primary">800</div>
                <p className="text-xs text-muted-foreground">
                  Caractères max par chunk
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-sm font-medium">Chunks scannés</div>
                <div className="text-2xl font-bold text-primary">500</div>
                <p className="text-xs text-muted-foreground">
                  Maximum de chunks comparés
                </p>
              </div>
            </div>
          </div>

          {/* Rate Limits */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <Label className="font-medium">Rate limiting</Label>
            </div>
            <div className="pl-6 grid gap-3 sm:grid-cols-2">
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-sm font-medium">helpi-search</div>
                <div className="text-lg font-bold">30 req/min</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-sm font-medium">helpi-index</div>
                <div className="text-lg font-bold">5 req/10min</div>
              </div>
            </div>
          </div>

          {/* Sources */}
          <div className="space-y-2">
            <Label className="font-medium">Sources indexables</Label>
            <div className="pl-6 flex flex-wrap gap-2">
              <Badge>apogee</Badge>
              <Badge>helpconfort</Badge>
              <Badge>document</Badge>
              <Badge>faq</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            Les paramètres sont actuellement codés en dur dans les Edge Functions.
            <br />
            Une interface de configuration dynamique sera disponible dans une future version.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
