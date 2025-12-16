import { AlertTriangle, CheckCircle2, ExternalLink, Building2, User, UserCircle, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  ResolvedSmartToken, 
  groupTokensByCategory, 
  getCompletenessStats 
} from "@/hooks/docgen/useSmartTokenValues";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface SmartTokensCompletenessCheckProps {
  tokens: ResolvedSmartToken[];
  onContinue: () => void;
  collaboratorId?: string | null;
}

const CATEGORY_CONFIG = {
  agence: {
    label: "Agence",
    icon: Building2,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    editPath: "/settings",
  },
  collaborateur: {
    label: "Collaborateur",
    icon: User,
    color: "text-green-600",
    bgColor: "bg-green-50",
    editPath: "/rh/equipe",
  },
  dirigeant: {
    label: "Dirigeant",
    icon: UserCircle,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    editPath: "/settings/profile",
  },
  user: {
    label: "Utilisateur connecté",
    icon: UserCircle,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    editPath: "/settings/profile",
  },
  date: {
    label: "Dates",
    icon: Calendar,
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    editPath: undefined,
  },
};

export default function SmartTokensCompletenessCheck({
  tokens,
  onContinue,
  collaboratorId,
}: SmartTokensCompletenessCheckProps) {
  const grouped = groupTokensByCategory(tokens);
  const stats = getCompletenessStats(tokens);
  
  const hasMissingTokens = stats.missing > 0;

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {hasMissingTokens ? (
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                )}
                Vérification des données
              </CardTitle>
              <CardDescription>
                {hasMissingTokens
                  ? `${stats.missing} champ(s) manquant(s) seront vides dans le document`
                  : "Toutes les données automatiques sont renseignées"}
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{stats.percentage}%</div>
              <div className="text-xs text-muted-foreground">complet</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={stats.percentage} className="h-2" />
          <p className="text-sm text-muted-foreground mt-2">
            {stats.filled}/{stats.total} champs renseignés
          </p>
        </CardContent>
      </Card>

      {/* Categories */}
      <div className="space-y-4">
        {Object.entries(grouped).map(([category, categoryTokens]) => {
          const config = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG];
          if (!config) return null;
          
          const Icon = config.icon;
          const categoryMissing = categoryTokens.filter(t => !t.value && t.category !== "date");
          const hasCategoryMissing = categoryMissing.length > 0;

          // Build edit path - always use team page for collaborator editing
          let editPath = config.editPath;

          return (
            <Card key={category} className={cn(
              "transition-colors",
              hasCategoryMissing && "border-yellow-200 bg-yellow-50/30"
            )}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className={cn("p-1.5 rounded-md", config.bgColor)}>
                      <Icon className={cn("h-4 w-4", config.color)} />
                    </div>
                    {config.label}
                    {hasCategoryMissing && (
                      <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50">
                        {categoryMissing.length} manquant(s)
                      </Badge>
                    )}
                  </CardTitle>
                  {editPath && hasCategoryMissing && (
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={editPath} target="_blank">
                        Compléter
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {categoryTokens.map((token) => (
                    <div
                      key={token.token}
                      className={cn(
                        "flex items-center justify-between p-2 rounded-lg text-sm",
                        token.value ? "bg-muted/50" : "bg-yellow-100/50 border border-yellow-200"
                      )}
                    >
                      <span className="font-medium">{token.label}</span>
                      {token.value ? (
                        <span className="text-muted-foreground truncate max-w-[200px]">
                          {token.value}
                        </span>
                      ) : (
                        <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                          Non renseigné
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Continue button */}
      <div className="flex justify-end pt-4">
        <Button onClick={onContinue} size="lg">
          {hasMissingTokens ? "Continuer quand même" : "Continuer"}
        </Button>
      </div>
    </div>
  );
}
