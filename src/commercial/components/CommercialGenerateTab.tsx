import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Download, 
  Loader2, 
  Upload, 
  AlertTriangle,
  CheckCircle,
  FileUp
} from "lucide-react";
import { useCommercialProfile, useGeneratePptx, useUploadTemplate } from "../hooks/useCommercialProfile";
import { toast } from "sonner";

interface CommercialGenerateTabProps {
  agencyId: string | null;
}

export function CommercialGenerateTab({ agencyId }: CommercialGenerateTabProps) {
  const { data: profile, isLoading: profileLoading } = useCommercialProfile(agencyId);
  const generateMutation = useGeneratePptx();
  const uploadTemplateMutation = useUploadTemplate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [generatedFile, setGeneratedFile] = useState<{
    downloadUrl: string;
    fileName: string;
    generatedAt: string;
  } | null>(null);

  const handleGenerate = async () => {
    if (!agencyId) return;
    
    try {
      const result = await generateMutation.mutateAsync(agencyId);
      setGeneratedFile({
        downloadUrl: result.downloadUrl,
        fileName: result.fileName,
        generatedAt: result.generatedAt,
      });
      toast.success('PowerPoint généré avec succès !');
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleTemplateUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.pptx')) {
      toast.error('Le fichier doit être au format .pptx');
      return;
    }

    const confirmed = window.confirm(
      'Attention : remplacer le template maître affectera toutes les futures générations.\n\n' +
      'Assurez-vous que le nouveau fichier contient les placeholders {{...}} attendus.\n\n' +
      'Continuer ?'
    );

    if (confirmed) {
      uploadTemplateMutation.mutate(file);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Check profile completeness
  const requiredFields = [
    'agence_nom_long',
    'baseline',
    'zones_intervention',
    'email_contact',
    'phone_contact',
  ] as const;

  const missingFields = requiredFields.filter(
    field => !profile?.[field]
  );

  const isProfileComplete = missingFields.length === 0;

  if (!agencyId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Veuillez sélectionner une agence
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Template Master Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5" />
            Modèle maître PPTX
          </CardTitle>
          <CardDescription>
            Le fichier template utilisé comme base pour la génération
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-orange-500" />
              <div>
                <p className="font-medium">support_agence_v1.pptx</p>
                <p className="text-sm text-muted-foreground">
                  Template avec placeholders {"{{...}}"}
                </p>
              </div>
            </div>
            <div>
              <input
                type="file"
                ref={fileInputRef}
                accept=".pptx"
                onChange={handleTemplateUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadTemplateMutation.isPending}
              >
                {uploadTemplateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Remplacer
              </Button>
            </div>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Important</AlertTitle>
            <AlertDescription>
              Le template doit contenir les placeholders au format {"{{NOM_VARIABLE}}"} 
              pour que le remplacement fonctionne. Consultez l'onglet Documentation 
              pour la liste complète des variables.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Separator />

      {/* Generation Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Génération du PowerPoint
          </CardTitle>
          <CardDescription>
            Générez un PowerPoint personnalisé avec les données de l'agence
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Status */}
          {profileLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement du profil...
            </div>
          ) : !profile ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Profil non configuré</AlertTitle>
              <AlertDescription>
                Veuillez d'abord configurer le profil commercial dans l'onglet Configuration.
              </AlertDescription>
            </Alert>
          ) : !isProfileComplete ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Profil incomplet</AlertTitle>
              <AlertDescription>
                Les champs suivants sont requis : {missingFields.join(', ')}
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-green-500/50 bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertTitle className="text-green-700 dark:text-green-400">Prêt à générer</AlertTitle>
              <AlertDescription className="text-green-600 dark:text-green-300">
                Le profil commercial est complet. Vous pouvez générer le PowerPoint.
              </AlertDescription>
            </Alert>
          )}

          {/* Generate Button */}
          <Button
            size="lg"
            onClick={handleGenerate}
            disabled={!isProfileComplete || generateMutation.isPending || !profile}
            className="w-full"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Génération en cours...
              </>
            ) : (
              <>
                <FileText className="h-5 w-5 mr-2" />
                Générer le PowerPoint commercial
              </>
            )}
          </Button>

          {/* Generated File Download */}
          {generatedFile && (
            <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="font-medium">{generatedFile.fileName}</p>
                    <p className="text-sm text-muted-foreground">
                      Généré le {new Date(generatedFile.generatedAt).toLocaleString('fr-FR')}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-green-500/20 text-green-700">
                  Prêt
                </Badge>
              </div>
              
              <Button asChild className="w-full">
                <a href={generatedFile.downloadUrl} download={generatedFile.fileName}>
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger le PowerPoint
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
