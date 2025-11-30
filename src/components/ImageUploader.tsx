import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logError } from '@/lib/logger';

const supabaseAny = supabase as any;

interface ImageUploaderProps {
  currentImage?: string;
  onImageChange: (imageUrl: string | null) => void;
  bucketName: string;
  maxSize?: number; // in MB
}

export const ImageUploader = ({ 
  currentImage, 
  onImageChange, 
  bucketName,
  maxSize = 5 
}: ImageUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImage || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Vérifier la taille
    if (file.size > maxSize * 1024 * 1024) {
      toast({
        title: 'Erreur',
        description: `L'image ne doit pas dépasser ${maxSize} Mo`,
        variant: 'destructive',
      });
      return;
    }

    // Vérifier le type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Erreur',
        description: 'Le fichier doit être une image',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      // Créer un nom unique pour le fichier
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      // Upload vers Supabase Storage
      const { error: uploadError } = await supabaseAny.storage
        .from(bucketName)
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabaseAny.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      setPreviewUrl(publicUrl);
      onImageChange(publicUrl);

      toast({
        title: 'Succès',
        description: 'Image téléchargée avec succès',
      });
    } catch (error) {
      logError('IMAGE_UPLOADER', 'Error uploading image:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de télécharger l\'image',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onImageChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Image de la carte (90x90px recommandé)</label>
      <div className="flex items-center gap-3">
        {previewUrl && (
          <div className="relative">
            <img 
              src={previewUrl} 
              alt="Preview" 
              className="w-[90px] h-[90px] object-cover rounded border-2 border-border"
            />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5 hover:bg-destructive/90"
            >
              <X size={12} />
            </button>
          </div>
        )}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="image-upload"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? 'Upload...' : previewUrl ? 'Changer' : 'Upload'}
          </Button>
        </div>
      </div>
    </div>
  );
};
