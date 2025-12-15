import { useState, useMemo } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle, Loader2, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DocInstance, useFinalizeDocument } from "@/hooks/docgen/useDocInstances";
import { toast } from "sonner";
import { categorizeTokens } from "@/lib/docgen/smartTokens";
import { TokenConfig, getTokenConfig, formatTokenLabel } from "@/lib/docgen/tokenConfig";

interface DocInstanceEditorProps {
  instance: DocInstance;
  onBack: () => void;
}

export default function DocInstanceEditor({ instance, onBack }: DocInstanceEditorProps) {
  const [tokenValues, setTokenValues] = useState<Record<string, string>>(instance.token_values || {});
  const [currentStep, setCurrentStep] = useState(0);

  const finalizeDocument = useFinalizeDocument();

  const tokens = instance.template?.tokens || [];
  const { smartTokens, manualTokens } = categorizeTokens(tokens);

  // Build a map of token configs for quick lookup
  const tokenConfigsMap = useMemo(() => {
    const map = new Map<string, TokenConfig>();
    for (const t of tokens) {
      const config = getTokenConfig(t);
      map.set(config.token, config);
    }
    return map;
  }, [tokens]);

  const hasSmartIntro = smartTokens.length > 0;

  // Get current manual token index
  const currentTokenIndex = hasSmartIntro ? currentStep - 1 : currentStep;
  const currentToken = manualTokens[currentTokenIndex];

  // Get current token config
  const currentTokenConfig = currentToken ? tokenConfigsMap.get(currentToken) : undefined;

  const isLastManualToken = manualTokens.length === 0
    ? true
    : currentTokenIndex === manualTokens.length - 1;

  // Progress percentage
  const progressPercent = useMemo(() => {
    if (manualTokens.length === 0) return 100;
    const filledCount = manualTokens.filter(t => tokenValues[t]?.trim()).length;
    return Math.round((filledCount / manualTokens.length) * 100);
  }, [manualTokens, tokenValues]);

  const handleTokenChange = (token: string, value: string) => {
    setTokenValues(prev => ({ ...prev, [token]: value }));
  };

  const handleNext = () => {
    const maxStep = hasSmartIntro ? manualTokens.length : Math.max(0, manualTokens.length - 1);
    if (currentStep < maxStep) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleFinalize = async () => {
    const result = await finalizeDocument.mutateAsync({
      instanceId: instance.id,
      tokenValues,
    });

    if (result.finalPath) {
      toast.success("Document finalisé et enregistré");
      onBack();
    }
  };

  // Get title for a token (from config or fallback)
  const getTokenTitle = (token: string): string => {
    const config = tokenConfigsMap.get(token);
    if (config?.title) return config.title;
    return formatTokenLabel(token);
  };

  // Get description for a token (from config)
  const getTokenDescription = (token: string): string => {
    const config = tokenConfigsMap.get(token);
    return config?.description || "";
  };

  const isLongToken = (token: string): boolean => {
    const longTokens = ["description", "commentaire", "motif", "observations", "details", "clause"];
    return longTokens.some(lt => token.toLowerCase().includes(lt));
  };

  // Step info for display
  const getStepInfo = () => {
    const total = Math.max(1, manualTokens.length + (hasSmartIntro ? 1 : 0));

    // No manual tokens: single step (auto-filled or empty)
    if (manualTokens.length === 0) {
      return {
        current: 1,
        total,
        title: hasSmartIntro ? "Informations automatiques" : "Document prêt",
        description: hasSmartIntro 
          ? "Ces données seront remplies automatiquement" 
          : "Aucune information à saisir",
      };
    }

    if (hasSmartIntro && currentStep === 0) {
      return { 
        current: 1, 
        total, 
        title: "Informations automatiques",
        description: "Ces données seront remplies automatiquement",
      };
    }

    const current = Math.min(currentStep + 1, total);
    const tokenNumber = currentTokenIndex + 1;
    const tokenTitle = currentToken ? getTokenTitle(currentToken) : "Finalisation";
    
    return {
      current,
      total,
      title: `Champ ${tokenNumber}/${manualTokens.length}`,
      description: tokenTitle,
    };
  };

  const stepInfo = getStepInfo();
  const canGoNext = hasSmartIntro && currentStep === 0
    ? true
    : !!(currentToken && tokenValues[currentToken]?.trim());

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{instance.name}</h1>
          <p className="text-muted-foreground">
            Template: {instance.template?.name}
          </p>
        </div>
        <Badge variant={instance.status === "finalized" ? "default" : "secondary"}>
          {instance.status === "draft" && "Brouillon"}
          {instance.status === "preview" && "Aperçu"}
          {instance.status === "finalized" && "Finalisé"}
        </Badge>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            Étape {stepInfo.current}/{stepInfo.total} — {stepInfo.title}
          </span>
          <span className="font-medium">{progressPercent}%</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Step Form */}
      <Card className="flex flex-col max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {currentStep === 0 && smartTokens.length > 0 && (
              <>
                <Sparkles className="h-5 w-5 text-primary" />
                {stepInfo.title}
              </>
            )}
            {(currentStep > 0 || smartTokens.length === 0) && currentToken && (
              getTokenTitle(currentToken)
            )}
          </CardTitle>
          <CardDescription>
            {currentStep === 0 && smartTokens.length > 0 && 
              stepInfo.description
            }
            {(currentStep > 0 || smartTokens.length === 0) && currentToken && (
              getTokenDescription(currentToken) || "Saisissez la valeur pour ce champ du document"
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col">
          {/* Intro Step - Smart Tokens */}
          {currentStep === 0 && smartTokens.length > 0 && (
            <div className="space-y-3 flex-1">
              <p className="text-sm text-muted-foreground mb-4">
                Les champs suivants seront pré-remplis avec les données de votre agence et du collaborateur :
              </p>
              <div className="grid gap-2">
                {smartTokens.map(({ token, label }) => (
                  <div 
                    key={token} 
                    className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10"
                  >
                    <span className="text-sm font-medium">{label}</span>
                    <Badge variant="outline" className="font-mono text-xs bg-background">
                      Auto
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Manual Token Input */}
          {(currentStep > 0 || smartTokens.length === 0) && currentToken && (
            <div className="space-y-4 flex-1">
              <Label htmlFor={currentToken} className="text-lg font-medium">
                {getTokenTitle(currentToken)}
              </Label>
              {isLongToken(currentToken) ? (
                <Textarea
                  id={currentToken}
                  value={tokenValues[currentToken] || ""}
                  onChange={(e) => handleTokenChange(currentToken, e.target.value)}
                  placeholder="Saisissez la valeur..."
                  rows={6}
                  className="text-lg"
                  autoFocus
                />
              ) : (
                <Input
                  id={currentToken}
                  value={tokenValues[currentToken] || ""}
                  onChange={(e) => handleTokenChange(currentToken, e.target.value)}
                  placeholder="Saisissez la valeur..."
                  className="text-lg h-14"
                  autoFocus
                />
              )}
              {getTokenDescription(currentToken) && (
                <p className="text-sm text-muted-foreground">
                  {getTokenDescription(currentToken)}
                </p>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 mt-6 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex-1"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Précédent
            </Button>
            
            {!isLastManualToken ? (
              <Button
                onClick={handleNext}
                disabled={!canGoNext}
                className="flex-1"
              >
                Suivant
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleFinalize}
                disabled={finalizeDocument.isPending || instance.status === "finalized" || progressPercent < 100}
                className="flex-1"
              >
                {finalizeDocument.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Valider et finaliser
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
