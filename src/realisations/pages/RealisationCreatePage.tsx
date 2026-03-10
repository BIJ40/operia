/**
 * RealisationCreatePage — Formulaire simple : infos de base + upload photos
 */
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Send, Camera, Loader2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useCreateRealisation } from '../hooks/useRealisationMutations';
import { useUploadMedia } from '../hooks/useRealisationMedia';
import { useEffectiveAuth } from '@/hooks/useEffectiveAuth';
import { SERVICE_FAMILIES, MEDIA_ROLE_LABELS, type MediaRole, type Realisation } from '../types';
import { toast } from 'sonner';

interface PendingFile {
  file: File;
  role: MediaRole;
  preview: string;
}

export default function RealisationCreatePage() {
  const navigate = useNavigate();
  const createRealisation = useCreateRealisation();
  const uploadMedia = useUploadMedia();
  const { agencyId } = useEffectiveAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);

  const [form, setForm] = useState({
    title: '',
    description: '',
    city: '',
    postal_code: '',
    service_family: '',
    technician_name: '',
    intervention_date: '',
  });

  const updateField = useCallback((key: keyof typeof form, value: string) => {
    setForm(f => ({ ...f, [key]: value }));
  }, []);

  const handleAddFiles = (files: FileList | null, role: MediaRole) => {
    if (!files) return;
    const newFiles = Array.from(files).map(file => ({
      file,
      role,
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

  const handleSave = async (sendToReview = false) => {
    if (!agencyId) return;
    if (!form.title.trim()) {
      toast.error('Le titre est obligatoire');
      return;
    }
    setIsSaving(true);
    try {
      const input: Partial<Realisation> = {
        ...form,
        validation_status: sendToReview ? 'pending_review' : 'draft',
      };
      const created = await createRealisation.mutateAsync(input);

      for (const pf of pendingFiles) {
        await uploadMedia.mutateAsync({
          realisationId: created.id,
          agencyId,
          file: pf.file,
          mediaRole: pf.role,
        });
      }

      toast.success(sendToReview ? 'Envoyé en validation' : 'Brouillon enregistré');
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
        <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">Nouvelle réalisation</h1>
          </div>
        </div>
      </div>

      <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-6 space-y-6 pb-28">
        {/* Infos de base */}
        <Card>
          <CardHeader><CardTitle className="text-base">Informations</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Titre *</Label>
              <Input className="mt-1" value={form.title} onChange={e => updateField('title', e.target.value)} placeholder="Ex: Remplacement serrure 3 points" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea className="mt-1" rows={3} value={form.description} onChange={e => updateField('description', e.target.value)} placeholder="Description courte de l'intervention..." />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Ville</Label>
                <Input className="mt-1" value={form.city} onChange={e => updateField('city', e.target.value)} />
              </div>
              <div>
                <Label>Code postal</Label>
                <Input className="mt-1" value={form.postal_code} onChange={e => updateField('postal_code', e.target.value)} />
              </div>
              <div>
                <Label>Métier</Label>
                <select className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background mt-1" value={form.service_family} onChange={e => updateField('service_family', e.target.value)}>
                  <option value="">Sélectionner</option>
                  {SERVICE_FAMILIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <Label>Technicien</Label>
                <Input className="mt-1" value={form.technician_name} onChange={e => updateField('technician_name', e.target.value)} />
              </div>
              <div>
                <Label>Date d'intervention</Label>
                <Input type="date" className="mt-1" value={form.intervention_date} onChange={e => updateField('intervention_date', e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Photos */}
        <Card>
          <CardHeader><CardTitle className="text-base">Photos</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {(['before', 'during', 'after'] as const).map(role => (
              <div key={role}>
                <Label className="text-sm font-medium mb-2 block">{MEDIA_ROLE_LABELS[role]}</Label>
                <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
                  <label className="cursor-pointer block">
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Glisser ou cliquer pour ajouter</p>
                    <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, WebP (max 50 Mo)</p>
                    <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => handleAddFiles(e.target.files, role)} />
                  </label>
                </div>
                {pendingFiles.filter(f => f.role === role).length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
                    {pendingFiles.map((pf, idx) => pf.role === role && (
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
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 z-50">
        <div className="max-w-[800px] mx-auto flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => handleSave(false)} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            Brouillon
          </Button>
          <Button onClick={() => handleSave(true)} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
            Envoyer en validation
          </Button>
        </div>
      </div>
    </div>
  );
}
