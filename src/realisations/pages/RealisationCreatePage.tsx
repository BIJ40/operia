/**
 * RealisationCreatePage — 4-step wizard for creating a new realisation
 */
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Save, Send, Camera, CheckCircle2, Loader2, MapPin, FileText, Wrench, Sparkles, Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useCreateRealisation } from '../hooks/useRealisationMutations';
import { useUploadMedia } from '../hooks/useRealisationMedia';
import { useEffectiveAuth } from '@/hooks/useEffectiveAuth';
import {
  SERVICE_FAMILIES, CLIENT_TYPE_LABELS, MEDIA_ROLE_LABELS,
  type MediaRole, type Realisation,
} from '../types';
import { toast } from 'sonner';

type WizardStep = 1 | 2 | 3 | 4;

const STEPS = [
  { step: 1, label: 'Informations', icon: FileText },
  { step: 2, label: 'Médias', icon: Camera },
  { step: 3, label: 'Qualification', icon: Wrench },
  { step: 4, label: 'SEO & Validation', icon: Sparkles },
] as const;

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
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);

  const [form, setForm] = useState<Partial<Realisation>>({
    title: '',
    description: '',
    short_summary: '',
    city: '',
    postal_code: '',
    department: '',
    intervention_address: '',
    service_family: '',
    service_type: '',
    chantier_type: '',
    client_type: null,
    technician_name: '',
    apporteur_name: '',
    intervention_date: '',
    publication_consent: false,
    marketing_authorized: false,
    context_intervention: '',
    problem_initial: '',
    solution_applied: '',
    materials_used: '',
    differentiators: '',
    approximate_duration: '',
    client_benefit: '',
    seo_city: '',
    seo_target_query: '',
    seo_article_angle: '',
    seo_suggested_title: '',
    seo_meta_description: '',
    seo_slug: '',
  });

  const updateField = useCallback(<K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
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
    setIsSaving(true);
    try {
      const input: Partial<Realisation> = {
        ...form,
        validation_status: sendToReview ? 'pending_review' : 'draft',
      };
      const created = await createRealisation.mutateAsync(input);

      // Upload pending files
      for (const pf of pendingFiles) {
        await uploadMedia.mutateAsync({
          realisationId: created.id,
          agencyId,
          file: pf.file,
          mediaRole: pf.role,
        });
      }

      toast.success(sendToReview ? 'Réalisation envoyée en validation' : 'Brouillon enregistré');
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
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/realisations')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground">Nouvelle réalisation</h1>
              <p className="text-xs text-muted-foreground">Étape {currentStep} / 4</p>
            </div>
          </div>
        </div>
      </div>

      {/* Step indicator */}
      <div className="max-w-[900px] mx-auto px-4 sm:px-6 pt-6">
        <div className="flex items-center gap-2 mb-6">
          {STEPS.map(({ step, label, icon: Icon }) => (
            <div key={step} className="flex-1">
              <button
                onClick={() => setCurrentStep(step as WizardStep)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  currentStep === step
                    ? 'bg-primary text-primary-foreground'
                    : currentStep > step
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-[900px] mx-auto px-4 sm:px-6 pb-24">
        {/* Step 1: Info */}
        {currentStep === 1 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Informations générales</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Titre de la réalisation</Label><Input className="mt-1" value={form.title || ''} onChange={e => updateField('title', e.target.value)} placeholder="Ex: Remplacement serrure 3 points" /></div>
              <div><Label>Description</Label><Textarea className="mt-1" rows={3} value={form.description || ''} onChange={e => updateField('description', e.target.value)} placeholder="Décrivez l'intervention..." /></div>
              <div><Label>Résumé court</Label><Input className="mt-1" value={form.short_summary || ''} onChange={e => updateField('short_summary', e.target.value)} placeholder="2-3 phrases max" /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>Ville</Label><Input className="mt-1" value={form.city || ''} onChange={e => updateField('city', e.target.value)} /></div>
                <div><Label>Code postal</Label><Input className="mt-1" value={form.postal_code || ''} onChange={e => updateField('postal_code', e.target.value)} /></div>
                <div><Label>Département</Label><Input className="mt-1" value={form.department || ''} onChange={e => updateField('department', e.target.value)} /></div>
                <div><Label>Adresse intervention</Label><Input className="mt-1" value={form.intervention_address || ''} onChange={e => updateField('intervention_address', e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>Technicien</Label><Input className="mt-1" value={form.technician_name || ''} onChange={e => updateField('technician_name', e.target.value)} /></div>
                <div><Label>Apporteur</Label><Input className="mt-1" value={form.apporteur_name || ''} onChange={e => updateField('apporteur_name', e.target.value)} /></div>
                <div><Label>Date d'intervention</Label><Input type="date" className="mt-1" value={form.intervention_date || ''} onChange={e => updateField('intervention_date', e.target.value)} /></div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Media */}
        {currentStep === 2 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Photos & Médias</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              {/* Upload zones by role */}
              {(['before', 'during', 'after'] as const).map(role => (
                <div key={role}>
                  <Label className="text-sm font-medium mb-2 block">{MEDIA_ROLE_LABELS[role]}</Label>
                  <div className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors">
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
                            className="absolute top-1 right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Qualification */}
        {currentStep === 3 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Qualification métier</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Famille de service</Label>
                  <select className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background mt-1" value={form.service_family || ''} onChange={e => updateField('service_family', e.target.value)}>
                    <option value="">Sélectionner</option>
                    {SERVICE_FAMILIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div><Label>Service</Label><Input className="mt-1" value={form.service_type || ''} onChange={e => updateField('service_type', e.target.value)} /></div>
                <div><Label>Type de chantier</Label><Input className="mt-1" value={form.chantier_type || ''} onChange={e => updateField('chantier_type', e.target.value)} /></div>
                <div>
                  <Label>Type de client</Label>
                  <select className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background mt-1" value={form.client_type || ''} onChange={e => updateField('client_type', e.target.value || null)}>
                    <option value="">Sélectionner</option>
                    {Object.entries(CLIENT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div><Label>Contexte d'intervention</Label><Textarea className="mt-1" value={form.context_intervention || ''} onChange={e => updateField('context_intervention', e.target.value)} /></div>
              <div><Label>Problème initial</Label><Textarea className="mt-1" value={form.problem_initial || ''} onChange={e => updateField('problem_initial', e.target.value)} /></div>
              <div><Label>Solution apportée</Label><Textarea className="mt-1" value={form.solution_applied || ''} onChange={e => updateField('solution_applied', e.target.value)} /></div>
              <div><Label>Matériaux / équipements</Label><Input className="mt-1" value={form.materials_used || ''} onChange={e => updateField('materials_used', e.target.value)} /></div>
              <div><Label>Points différenciants</Label><Textarea className="mt-1" value={form.differentiators || ''} onChange={e => updateField('differentiators', e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Durée approximative</Label><Input className="mt-1" value={form.approximate_duration || ''} onChange={e => updateField('approximate_duration', e.target.value)} /></div>
                <div><Label>Bénéfice client</Label><Input className="mt-1" value={form.client_benefit || ''} onChange={e => updateField('client_benefit', e.target.value)} /></div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: SEO & Submit */}
        {currentStep === 4 && (
          <Card>
            <CardHeader><CardTitle className="text-base">SEO & Validation</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>Ville SEO</Label><Input className="mt-1" value={form.seo_city || ''} onChange={e => updateField('seo_city', e.target.value)} /></div>
                <div><Label>Requête cible</Label><Input className="mt-1" value={form.seo_target_query || ''} onChange={e => updateField('seo_target_query', e.target.value)} /></div>
              </div>
              <div><Label>Angle d'article</Label><Textarea className="mt-1" value={form.seo_article_angle || ''} onChange={e => updateField('seo_article_angle', e.target.value)} /></div>
              <div><Label>Titre SEO suggéré</Label><Input className="mt-1" value={form.seo_suggested_title || ''} onChange={e => updateField('seo_suggested_title', e.target.value)} /></div>
              <div><Label>Meta description</Label><Textarea className="mt-1" rows={3} value={form.seo_meta_description || ''} onChange={e => updateField('seo_meta_description', e.target.value)} /></div>
              <div><Label>Slug</Label><Input className="mt-1" value={form.seo_slug || ''} onChange={e => updateField('seo_slug', e.target.value)} /></div>
              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.publication_consent || false} onChange={e => updateField('publication_consent', e.target.checked)} />
                  <span className="text-sm">Consentement publication</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.marketing_authorized || false} onChange={e => updateField('marketing_authorized', e.target.checked)} />
                  <span className="text-sm">Autorisation marketing</span>
                </label>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 z-50">
        <div className="max-w-[900px] mx-auto flex items-center justify-between">
          <Button variant="outline" disabled={currentStep === 1} onClick={() => setCurrentStep(s => (s - 1) as WizardStep)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Précédent
          </Button>
          <div className="flex gap-2">
            {currentStep < 4 ? (
              <Button onClick={() => setCurrentStep(s => (s + 1) as WizardStep)}>
                Suivant <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => handleSave(false)} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                  Brouillon
                </Button>
                <Button onClick={() => handleSave(true)} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
                  Envoyer en validation
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
