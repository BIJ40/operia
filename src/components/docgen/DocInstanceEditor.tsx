import { useState } from "react";
import { ArrowLeft, Eye, Download, CheckCircle, Loader2, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DocInstance, useGeneratePreview, useFinalizeDocument } from "@/hooks/docgen/useDocInstances";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { categorizeTokens, SMART_TOKENS, SmartTokenKey } from "@/lib/docgen/smartTokens";

interface DocInstanceEditorProps {
  instance: DocInstance;
  onBack: () => void;
}

export default function DocInstanceEditor({ instance, onBack }: DocInstanceEditorProps) {
  const [tokenValues, setTokenValues] = useState<Record<string, string>>(instance.token_values || {});
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const generatePreview = useGeneratePreview();
  const finalizeDocument = useFinalizeDocument();

  const tokens = instance.template?.tokens || [];
  const { smartTokens, manualTokens } = categorizeTokens(tokens);

  const handleTokenChange = (token: string, value: string) => {
    setTokenValues(prev => ({ ...prev, [token]: value }));
  };

  const handlePreview = async () => {
    const result = await generatePreview.mutateAsync({
      instanceId: instance.id,
      tokenValues,
    });

    if (result.previewPath) {
      setPreviewPath(result.previewPath);
      
      // Get signed URL for preview
      const { data } = await supabase.storage
        .from("doc-generated")
        .createSignedUrl(result.previewPath, 300);
      
      if (data?.signedUrl) {
        setPreviewUrl(data.signedUrl);
      }

      toast.success("Aperçu généré");
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

  const handleDownloadPreview = () => {
    if (previewUrl) {
      window.open(previewUrl, "_blank");
    }
  };

  // Get label for smart token
  const getSmartTokenLabel = (token: string): string => {
    const info = SMART_TOKENS[token as SmartTokenKey];
    return info?.label || token;
  };

  // Auto-fill token hints for manual tokens
  const getTokenHint = (token: string): string => {
    const hints: Record<string, string> = {
      salaire: "Salaire mensuel brut",
      motif: "Motif du document",
      duree: "Durée du contrat",
      periode_essai: "Durée période d'essai",
      convention: "Convention collective applicable",
    };
    return hints[token.toLowerCase()] || `Valeur pour ${token}`;
  };

  const isLongToken = (token: string): boolean => {
    const longTokens = ["description", "commentaire", "motif", "observations", "details", "clause"];
    return longTokens.some(lt => token.toLowerCase().includes(lt));
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Token Form */}
        <Card>
          <CardHeader>
            <CardTitle>Informations du document</CardTitle>
            <CardDescription>
              Remplissez les champs pour personnaliser le document
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Smart tokens (auto-filled) */}
            {smartTokens.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Sparkles className="h-4 w-4" />
                  Champs pré-remplis automatiquement
                </div>
                <div className="grid gap-2">
                  {smartTokens.map(({ token, label }) => (
                    <div key={token} className="flex items-center justify-between p-2 rounded-md bg-primary/5 border border-primary/10">
                      <span className="text-sm font-medium">{label}</span>
                      <Badge variant="outline" className="font-mono text-xs">
                        {`{{${token}}}`}
                      </Badge>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Ces champs seront remplis automatiquement avec les données de l'agence, du collaborateur, etc.
                </p>
                <Separator />
              </div>
            )}

            {/* Manual tokens */}
            {manualTokens.length > 0 ? (
              <div className="space-y-4">
                <div className="text-sm font-medium">Champs à remplir manuellement</div>
                {manualTokens.map((token) => (
                  <div key={token} className="space-y-2">
                    <Label htmlFor={token} className="capitalize">
                      {token.replace(/_/g, " ")}
                    </Label>
                    {isLongToken(token) ? (
                      <Textarea
                        id={token}
                        value={tokenValues[token] || ""}
                        onChange={(e) => handleTokenChange(token, e.target.value)}
                        placeholder={getTokenHint(token)}
                        rows={3}
                      />
                    ) : (
                      <Input
                        id={token}
                        value={tokenValues[token] || ""}
                        onChange={(e) => handleTokenChange(token, e.target.value)}
                        placeholder={getTokenHint(token)}
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : smartTokens.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Aucun champ à remplir
              </p>
            ) : null}

            <Separator className="my-4" />

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handlePreview}
                disabled={generatePreview.isPending}
                className="flex-1"
              >
                {generatePreview.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4 mr-2" />
                )}
                Aperçu
              </Button>
              <Button
                onClick={handleFinalize}
                disabled={finalizeDocument.isPending || instance.status === "finalized"}
                className="flex-1"
              >
                {finalizeDocument.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Finaliser
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Aperçu du document</CardTitle>
            <CardDescription>
              Visualisez le document avant de le finaliser
            </CardDescription>
          </CardHeader>
          <CardContent>
            {previewUrl ? (
              <div className="space-y-4">
                <div className="border rounded-lg overflow-hidden bg-muted/50 aspect-[3/4]">
                  <iframe
                    src={previewUrl}
                    className="w-full h-full"
                    title="Aperçu du document"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={handleDownloadPreview}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger l'aperçu
                </Button>
              </div>
            ) : (
              <div className="border rounded-lg bg-muted/50 aspect-[3/4] flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Cliquez sur "Aperçu" pour visualiser</p>
                  <p className="text-sm">le document avec vos données</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
