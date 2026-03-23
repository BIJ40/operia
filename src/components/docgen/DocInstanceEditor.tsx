import { useState, useMemo, useEffect, useCallback } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle, Loader2, Sparkles, RotateCcw, Save, ClipboardCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DocInstance, useFinalizeDocument, useUpdateDocInstance } from "@/hooks/docgen/useDocInstances";
import { toast } from "sonner";
import { categorizeTokens } from "@/lib/docgen/smartTokens";
import { TokenConfig, getTokenConfig, formatTokenLabel, getTokenName } from "@/lib/docgen/tokenConfig";
import { useSmartTokenValues, resolveSmartTokens, getCompletenessStats } from "@/hooks/docgen/useSmartTokenValues";
import SmartTokensCompletenessCheck from "./SmartTokensCompletenessCheck";

interface DocInstanceEditorProps {
  instance: DocInstance;
  onBack: () => void;
}

type EditorPhase = "completeness-check" | "form-filling";

export default function DocInstanceEditor({ instance, onBack }: DocInstanceEditorProps) {
  const [tokenValues, setTokenValues] = useState<Record<string, string>>(instance.token_values || {});
  const [currentStep, setCurrentStep] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [localStatus, setLocalStatus] = useState(instance.status);
  const [phase, setPhase] = useState<EditorPhase>("completeness-check");

  const finalizeDocument = useFinalizeDocument();
  const updateInstance = useUpdateDocInstance();
  
  // Fetch smart token values for completeness check
  const { data: smartTokenData, isLoading: isLoadingSmartData } = useSmartTokenValues(
    instance.agency_id,
    instance.collaborator_id
  );
  
  // Sync local status when instance changes
  useEffect(() => {
    setLocalStatus(instance.status);
  }, [instance.status]);

  const tokens = instance.template?.tokens || [];
  const { smartTokens, manualTokens } = categorizeTokens(tokens);

  // Resolve smart tokens with their actual values
  const resolvedSmartTokens = useMemo(() => {
    const tokenNames = smartTokens.map(st => st.token);
    return resolveSmartTokens(tokenNames, smartTokenData);
  }, [smartTokens, smartTokenData]);

  const smartTokenStats = useMemo(() => {
    return getCompletenessStats(resolvedSmartTokens);
  }, [resolvedSmartTokens]);

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

  // Get current manual token index (now step 0 is after completeness check)
  const currentTokenIndex = hasSmartIntro ? currentStep - 1 : currentStep;
  const currentToken = manualTokens[currentTokenIndex];

  const isLastManualToken = manualTokens.length === 0
    ? true
    : currentTokenIndex === manualTokens.length - 1;

  // Progress percentage for manual tokens
  const progressPercent = useMemo(() => {
    if (manualTokens.length === 0) return 100;
    const filledCount = manualTokens.filter(t => tokenValues[t]?.trim()).length;
    return Math.round((filledCount / manualTokens.length) * 100);
  }, [manualTokens, tokenValues]);

  // Auto-save token values (debounced)
  const saveTokenValues = useCallback(async () => {
    if (!hasUnsavedChanges) return;
    
    await updateInstance.mutateAsync({
      id: instance.id,
      token_values: tokenValues,
    });
    setHasUnsavedChanges(false);
  }, [instance.id, tokenValues, hasUnsavedChanges, updateInstance]);

  // Auto-save every 5 seconds if there are changes
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    
    const timer = setTimeout(() => {
      saveTokenValues();
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [hasUnsavedChanges, saveTokenValues]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (hasUnsavedChanges) {
        updateInstance.mutate({
          id: instance.id,
          token_values: tokenValues,
        });
      }
    };
  }, []);

  const handleTokenChange = (token: string, value: string) => {
    setTokenValues(prev => ({ ...prev, [token]: value }));
    setHasUnsavedChanges(true);
  };

  const handleNext = async () => {
    if (hasUnsavedChanges) {
      await saveTokenValues();
    }
    
    const maxStep = hasSmartIntro ? manualTokens.length : Math.max(0, manualTokens.length - 1);
    if (currentStep < maxStep) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevious = async () => {
    if (hasUnsavedChanges) {
      await saveTokenValues();
    }
    
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else if (currentStep === 0 && phase === "form-filling") {
      // Go back to completeness check
      setPhase("completeness-check");
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

  const handleReopen = async () => {
    await updateInstance.mutateAsync({
      id: instance.id,
      status: "draft",
      final_path: null,
    });
    setLocalStatus("draft");
    setPhase("completeness-check");
    setCurrentStep(0);
    toast.success("Document ré-ouvert pour modification");
  };

  const handleContinueFromCompletenessCheck = () => {
    setPhase("form-filling");
    setCurrentStep(0);
  };

  const getTokenTitle = (token: string): string => {
    const config = tokenConfigsMap.get(token);
    if (config?.title) return config.title;
    return formatTokenLabel(token);
  };

  const getTokenDescription = (token: string): string => {
    const config = tokenConfigsMap.get(token);
    return config?.description || "";
  };

  const isLongToken = (token: string): boolean => {
    const longTokens = ["description", "commentaire", "motif", "observations", "details", "clause"];
    return longTokens.some(lt => token.toLowerCase().includes(lt));
  };

  const getStepInfo = () => {
    const total = Math.max(1, manualTokens.length + (hasSmartIntro ? 1 : 0));

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
    
    return {
      current,
      total,
      title: `Champ ${tokenNumber}/${manualTokens.length}`,
      description: currentToken ? getTokenTitle(currentToken) : "Finalisation",
    };
  };

  const stepInfo = getStepInfo();
  const canGoNext = hasSmartIntro && currentStep === 0
    ? true
    : !!(currentToken && tokenValues[currentToken]?.trim());

  // Show loading state while fetching smart token data
  if (isLoadingSmartData) {
    return (
      <div className="container mx-auto max-w-7xl py-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl py-6 space-y-6">
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
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
              <Save className="h-3 w-3 mr-1" />
              Non sauvegardé
            </Badge>
          )}
          <Badge variant={localStatus === "finalized" ? "default" : "secondary"}>
            {localStatus === "draft" && "Brouillon"}
            {localStatus === "preview" && "Aperçu"}
            {localStatus === "finalized" && "Finalisé"}
          </Badge>
          {localStatus === "finalized" && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleReopen}
              disabled={updateInstance.isPending}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Modifier
            </Button>
          )}
        </div>
      </div>

      {/* Phase: Completeness Check */}
      {phase === "completeness-check" && smartTokens.length > 0 && (
        <SmartTokensCompletenessCheck
          tokens={resolvedSmartTokens}
          onContinue={handleContinueFromCompletenessCheck}
          collaboratorId={instance.collaborator_id}
        />
      )}

      {/* Phase: Form Filling (or no smart tokens) */}
      {(phase === "form-filling" || smartTokens.length === 0) && (
        <>
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
              {/* Intro Step - Smart Tokens with values */}
              {currentStep === 0 && smartTokens.length > 0 && (
                <div className="space-y-3 flex-1">
                  <p className="text-sm text-muted-foreground mb-4">
                    Les champs suivants seront pré-remplis avec les données existantes :
                  </p>
                  <div className="grid gap-2">
                    {resolvedSmartTokens.map((resolved) => (
                      <div 
                        key={resolved.token} 
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          resolved.value 
                            ? "bg-primary/5 border-primary/10" 
                            : "bg-yellow-50 border-yellow-200"
                        }`}
                      >
                        <span className="text-sm font-medium">{resolved.label}</span>
                        {resolved.value ? (
                          <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {resolved.value}
                          </span>
                        ) : (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-300 text-xs">
                            Vide
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                  {smartTokenStats.missing > 0 && (
                    <p className="text-sm text-yellow-600 mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      ⚠️ {smartTokenStats.missing} champ(s) vide(s) apparaîtront sans valeur dans le document final.
                    </p>
                  )}
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
                  disabled={currentStep === 0 && phase === "form-filling" && smartTokens.length === 0}
                  className="flex-1"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  {currentStep === 0 && phase === "form-filling" && smartTokens.length > 0 
                    ? "Vérification" 
                    : "Précédent"}
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
                    disabled={finalizeDocument.isPending || localStatus === "finalized" || progressPercent < 100}
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
        </>
      )}
    </div>
  );
}
