/**
 * Page Ma Signature - Capture et gestion de la signature personnelle
 */
import React, { useState, useCallback } from "react";
import { PenTool, Trash2, Save, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMySignature, useSaveSignature, useDeleteSignature } from "@/hooks/rh-employee";
import { SignaturePad } from "@/components/signature";

/**
 * Convertit un dataURL SVG en dataURL PNG
 */
async function svgToPngDataUrl(svgDataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width || 400;
      canvas.height = img.height || 200;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }
      // Fill white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load SVG'));
    img.src = svgDataUrl;
  });
}

export default function MaSignaturePage() {
  const { data: signature, isLoading } = useMySignature();
  const saveSignature = useSaveSignature();
  const deleteSignature = useDeleteSignature();
  const [isEditing, setIsEditing] = useState(false);
  const [newSignature, setNewSignature] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!newSignature) return;
    
    setIsSaving(true);
    try {
      // Convertir SVG en PNG pour stockage
      const pngDataUrl = await svgToPngDataUrl(newSignature);
      
      saveSignature.mutate(
        { signatureSvg: newSignature, signaturePngBase64: pngDataUrl },
        {
          onSuccess: () => {
            setIsEditing(false);
            setNewSignature(null);
            setIsSaving(false);
          },
          onError: () => {
            setIsSaving(false);
          },
        }
      );
    } catch (error) {
      console.error('Erreur conversion signature:', error);
      // Sauvegarder quand même avec juste le SVG
      saveSignature.mutate(
        { signatureSvg: newSignature },
        {
          onSuccess: () => {
            setIsEditing(false);
            setNewSignature(null);
            setIsSaving(false);
          },
          onError: () => {
            setIsSaving(false);
          },
        }
      );
    }
  }, [newSignature, saveSignature]);

  const handleDelete = () => {
    if (confirm("Voulez-vous vraiment supprimer votre signature ?")) {
      deleteSignature.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        <PageHeader
          title="Ma Signature"
          subtitle="Votre signature électronique"
          backTo="/rh"
        />
        <Skeleton className="h-64 w-full max-w-lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <PageHeader
        title="Ma Signature"
        subtitle="Gérez votre signature électronique"
        backTo="/rh"
      />

      {/* Signature existante */}
      {signature && !isEditing && (
        <Card className="max-w-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                Signature enregistrée
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {format(new Date(signature.updated_at), "dd MMM yyyy", { locale: fr })}
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border rounded-lg bg-white p-4 flex items-center justify-center min-h-[150px]">
              <img
                src={signature.signature_svg}
                alt="Ma signature"
                className="max-w-full max-h-[120px]"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditing(true)} className="flex-1">
                <PenTool className="w-4 h-4 mr-2" />
                Modifier
              </Button>
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={handleDelete}
                disabled={deleteSignature.isPending}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mode édition / création */}
      {(!signature || isEditing) && (
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle className="text-lg">
              {signature ? "Modifier ma signature" : "Créer ma signature"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Dessinez votre signature dans le cadre ci-dessous.
              Cette signature sera utilisée pour vos demandes RH.
            </p>

            <div className="border rounded-lg overflow-hidden bg-white">
              <SignaturePad
                onChange={(dataUrl) => setNewSignature(dataUrl)}
                width="100%"
                height={200}
                showControls={true}
              />
            </div>

            <div className="flex gap-2">
              {signature && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setNewSignature(null);
                  }}
                  className="flex-1"
                >
                  Annuler
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={!newSignature || isSaving || saveSignature.isPending}
                className="flex-1"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving || saveSignature.isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <Card className="max-w-lg bg-muted/50">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">
            💡 Votre signature sera utilisée pour valider vos demandes de renouvellement EPI
            et pourra figurer sur les documents officiels générés.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
