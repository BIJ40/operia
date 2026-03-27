import { useState, useRef } from "react";
import { Camera, X, Upload, Loader2, ImagePlus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PhotoUploadDialogProps {
  refDossier: string;
  clientName: string;
  agencySlug?: string;
  verifiedPostalCode?: string;
}

const MAX_PHOTOS = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function PhotoUploadDialog({ refDossier, clientName, agencySlug, verifiedPostalCode }: PhotoUploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [commentaire, setCommentaire] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    const validFiles = files.filter(file => {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "Fichier trop volumineux",
          description: `${file.name} dépasse la limite de 5MB`,
          variant: "destructive",
        });
        return false;
      }
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Format non supporté",
          description: `${file.name} n'est pas une image`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    const totalFiles = selectedFiles.length + validFiles.length;
    if (totalFiles > MAX_PHOTOS) {
      toast({
        title: "Limite atteinte",
        description: `Maximum ${MAX_PHOTOS} photos autorisées`,
        variant: "destructive",
      });
      validFiles.splice(MAX_PHOTOS - selectedFiles.length);
    }

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    setSelectedFiles(prev => [...prev, ...validFiles]);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removePhoto = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "Aucune photo",
        description: "Veuillez sélectionner au moins une photo",
        variant: "destructive",
      });
      return;
    }

    if (!verifiedPostalCode) {
      toast({
        title: "Session expirée",
        description: "Veuillez rafraîchir la page",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const photosData = await Promise.all(
        selectedFiles.map(async (file) => ({
          name: file.name,
          type: file.type,
          data: await fileToBase64(file),
        }))
      );

      const { data, error: functionError } = await supabase.functions.invoke("suivi-send-client-photos", {
        body: {
          refDossier,
          clientName,
          photos: photosData,
          commentaire: commentaire.trim() || undefined,
          agencySlug,
          codePostal: verifiedPostalCode
        },
      });

      if (functionError) {
        throw functionError;
      }

      if (data?.error === 'Accès refusé') {
        toast({
          title: "Session expirée",
          description: "Veuillez rafraîchir la page",
          variant: "destructive",
        });
        return;
      }

      // Show success state inside dialog instead of closing
      setIsSuccess(true);
    } catch (error: any) {
      console.error("Error sending photos:", error);
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de l'envoi",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedFiles([]);
      setPreviews([]);
      setCommentaire("");
      setIsSuccess(false);
    }
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="default"
          size="sm"
          className="gap-1.5 bg-primary hover:bg-primary-dark text-primary-foreground shadow-md hover:shadow-lg transition-all text-xs"
        >
          📸 Envoyer des photos
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {isSuccess ? (
          /* Success state */
          <div className="flex flex-col items-center justify-center py-8 space-y-4 text-center">
            <div className="rounded-full bg-green-100 p-4">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold">Photos envoyées !</h3>
            <p className="text-sm text-muted-foreground">
              Vos photos ont été transmises avec succès à votre agence.
            </p>
            <Button
              onClick={() => handleOpenChange(false)}
              className="mt-4 bg-primary hover:bg-primary-dark"
            >
              Fermer
            </Button>
          </div>
        ) : (
          /* Upload form */
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-primary" />
                Envoyer des photos
              </DialogTitle>
              <DialogDescription>
                Transmettez jusqu'à {MAX_PHOTOS} photos pour votre dossier
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {previews.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {previews.map((preview, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-border">
                      <img
                        src={preview}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {selectedFiles.length < MAX_PHOTOS && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-primary/30 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                >
                  <ImagePlus className="h-8 w-8 mx-auto text-primary/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Cliquez pour ajouter une photo
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedFiles.length}/{MAX_PHOTOS} photos • Max 5MB par photo
                  </p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Commentaire <span className="text-muted-foreground font-normal">(optionnel)</span>
                </label>
                <Textarea
                  placeholder="Ajoutez un commentaire pour accompagner vos photos..."
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || selectedFiles.length === 0}
                className="bg-primary hover:bg-primary-dark"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Envoyer
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
