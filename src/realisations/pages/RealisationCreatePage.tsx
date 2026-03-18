/**
 * RealisationCreatePage — Ultra simple : titre + photos
 * Date = aujourd'hui, le reste sera détecté par l'outil externe.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Upload, X, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateRealisation } from '../hooks/useRealisationMutations';
import { useUploadMedia, useAutoSuggestRoles } from '../hooks/useRealisationMedia';
import { useDispatchWebhook } from '../hooks/useDispatchWebhook';
import { useEffectiveAuth } from '@/hooks/useEffectiveAuth';
import type { Realisation } from '../types';
import { toast } from 'sonner';

interface PendingFile {
  file: File;
  preview: string;
}

export default function RealisationCreatePage() {
  const navigate = useNavigate();
  const createRealisation = useCreateRealisation();
  const uploadMedia = useUploadMedia();
  const dispatchWebhook = useDispatchWebhook();
  const { agencyId } = useEffectiveAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [webhookDispatched, setWebhookDispatched] = useState(false);
  const [title, setTitle] = useState('');
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);

  const handleAddFiles = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setPendingFiles(prev => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setPendingFiles(prev => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[index].preview);
      copy.splice(index, 1);
      return copy;
    });
  };

  const handleSave = async () => {
    if (!agencyId) return;
    if (!title.trim()) {
      toast.error('Le titre est obligatoire');
      return;
    }
    if (pendingFiles.length === 0) {
      toast.error('Ajoutez au moins une photo');
      return;
    }
    setIsSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const input: Partial<Realisation> = {
        title: title.trim(),
        intervention_date: today,
      };
      const created = await createRealisation.mutateAsync(input);

      for (const pf of pendingFiles) {
        await uploadMedia.mutateAsync({
          realisationId: created.id,
          agencyId,
          file: pf.file,
          mediaRole: 'before',
        });
      }

      // Auto-dispatch webhook (fire and forget, once only)
      if (!webhookDispatched) {
        setWebhookDispatched(true);
        dispatchWebhook.mutate(created.id);
      }

      toast.success('Réalisation enregistrée');
      navigate(`/realisations/${created.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-[600px] mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-bold text-foreground">Nouvelle réalisation</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[600px] mx-auto px-4 sm:px-6 py-6 space-y-6 pb-28">
        {/* Titre */}
        <div>
          <Label className="text-sm font-medium">Titre *</Label>
          <Input
            className="mt-1.5"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Ex: Remplacement serrure 3 points"
            autoFocus
          />
        </div>

        {/* Photos */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Photos</Label>
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
            <label className="cursor-pointer block">
              <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground">Ajouter des photos</p>
              <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, WebP — glisser ou cliquer</p>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={e => handleAddFiles(e.target.files)}
              />
            </label>
          </div>

          {pendingFiles.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-4">
              {pendingFiles.map((pf, idx) => (
                <div key={idx} className="relative rounded-lg overflow-hidden border border-border aspect-square group">
                  <img src={pf.preview} className="w-full h-full object-cover" alt="" />
                  <button
                    onClick={() => handleRemoveFile(idx)}
                    className="absolute top-1 right-1 w-6 h-6 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {pendingFiles.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">{pendingFiles.length} photo{pendingFiles.length > 1 ? 's' : ''} sélectionnée{pendingFiles.length > 1 ? 's' : ''}</p>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 z-50">
        <div className="max-w-[600px] mx-auto">
          <Button className="w-full" size="lg" onClick={handleSave} disabled={isSaving || !title.trim() || pendingFiles.length === 0}>
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Camera className="w-4 h-4 mr-2" />}
            Enregistrer ({pendingFiles.length} photo{pendingFiles.length > 1 ? 's' : ''})
          </Button>
        </div>
      </div>
    </div>
  );
}
