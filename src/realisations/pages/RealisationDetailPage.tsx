/**
 * RealisationDetailPage — Full detail view with 6 tabs
 */
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Eye, Image, Wrench, Search as SearchIcon, Shield, History,
  CheckCircle2, XCircle, Globe, Archive, Camera, MapPin, User, Calendar, Star, Sparkles, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useRealisation } from '../hooks/useRealisations';
import { useRealisationMedia, useUploadMedia, useDeleteMedia } from '../hooks/useRealisationMedia';
import { useUpdateRealisation, useChangeValidationStatus, useChangePublicationStatus } from '../hooks/useRealisationMutations';
import { useRealisationActivityLog, ACTION_TYPE_LABELS } from '../hooks/useRealisationActivityLog';
import { computeQualityScore, computeSeoScore } from '../hooks/useRealisationScoring';
import {
  VALIDATION_STATUS_LABELS, VALIDATION_STATUS_COLORS,
  PUBLICATION_STATUS_LABELS, PUBLICATION_STATUS_COLORS,
  ARTICLE_STATUS_LABELS, CLIENT_TYPE_LABELS, MEDIA_ROLE_LABELS, SERVICE_FAMILIES,
  type MediaRole,
} from '../types';
import { toast } from 'sonner';

export default function RealisationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: realisation, isLoading } = useRealisation(id);
  const { data: media = [] } = useRealisationMedia(id);
  const { data: activityLog = [] } = useRealisationActivityLog(id);
  const updateRealisation = useUpdateRealisation();
  const changeValidation = useChangeValidationStatus();
  const changePub = useChangePublicationStatus();
  const uploadMedia = useUploadMedia();
  const deleteMedia = useDeleteMedia();
  const [uploadRole, setUploadRole] = useState<MediaRole>('after');
  const [rejectionReason, setRejectionReason] = useState('');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!realisation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Réalisation non trouvée</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/realisations')}>Retour</Button>
      </div>
    );
  }

  const r = realisation;
  const qualityResult = computeQualityScore(r, media);
  const seoResult = computeSeoScore(r, media);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      await uploadMedia.mutateAsync({
        realisationId: r.id,
        agencyId: r.agency_id,
        file,
        mediaRole: uploadRole,
      });
    }
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/realisations')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-foreground truncate">{r.title || 'Sans titre'}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <StatusBadge status={r.validation_status} type="validation" />
                <StatusBadge status={r.publication_status} type="publication" />
                {r.city && <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{r.city}</span>}
                {r.service_family && <span className="text-xs text-muted-foreground flex items-center gap-1"><Wrench className="w-3 h-3" />{r.service_family}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-sm">
                <Star className="w-4 h-4 text-accent" /> <span className="font-semibold">{qualityResult.score}</span>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <Sparkles className="w-4 h-4 text-primary" /> <span className="font-semibold">{seoResult.score}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-muted/50 border border-border">
            <TabsTrigger value="overview" className="gap-1"><Eye className="w-4 h-4" /> Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="media" className="gap-1"><Image className="w-4 h-4" /> Médias</TabsTrigger>
            <TabsTrigger value="qualification" className="gap-1"><Wrench className="w-4 h-4" /> Qualification</TabsTrigger>
            <TabsTrigger value="seo" className="gap-1"><SearchIcon className="w-4 h-4" /> SEO</TabsTrigger>
            <TabsTrigger value="validation" className="gap-1"><Shield className="w-4 h-4" /> Validation</TabsTrigger>
            <TabsTrigger value="history" className="gap-1"><History className="w-4 h-4" /> Historique</TabsTrigger>
          </TabsList>

          {/* Tab 1: Overview */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader><CardTitle className="text-base">Informations générales</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <InfoRow label="Titre" value={r.title} />
                    <InfoRow label="Description" value={r.description} />
                    <InfoRow label="Résumé" value={r.short_summary} />
                    <div className="grid grid-cols-2 gap-4">
                      <InfoRow label="Ville" value={r.city} />
                      <InfoRow label="Code postal" value={r.postal_code} />
                      <InfoRow label="Département" value={r.department} />
                      <InfoRow label="Adresse" value={r.intervention_address} />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Intervention</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <InfoRow label="Métier" value={r.service_family} />
                    <InfoRow label="Service" value={r.service_type} />
                    <InfoRow label="Type chantier" value={r.chantier_type} />
                    <InfoRow label="Type client" value={r.client_type ? CLIENT_TYPE_LABELS[r.client_type] : null} />
                    <InfoRow label="Technicien" value={r.technician_name} />
                    <InfoRow label="Apporteur" value={r.apporteur_name} />
                    <InfoRow label="Date intervention" value={r.intervention_date ? new Date(r.intervention_date).toLocaleDateString('fr-FR') : null} />
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-6">
                <ScoreCard title="Score Qualité" result={qualityResult} icon={Star} iconColor="text-accent" />
                <ScoreCard title="Score SEO" result={seoResult} icon={Sparkles} iconColor="text-primary" />
              </div>
            </div>
          </TabsContent>

          {/* Tab 2: Media */}
          <TabsContent value="media">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Médias ({media.length})</CardTitle>
                  <div className="flex items-center gap-2">
                    <select
                      className="text-xs border border-border rounded px-2 py-1 bg-background"
                      value={uploadRole}
                      onChange={e => setUploadRole(e.target.value as MediaRole)}
                    >
                      {Object.entries(MEDIA_ROLE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                    <label className="cursor-pointer">
                      <Button size="sm" asChild>
                        <span><Camera className="w-4 h-4 mr-1" /> Ajouter</span>
                      </Button>
                      <input type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4" className="hidden" onChange={handleFileUpload} />
                    </label>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {media.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Camera className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Aucun média. Ajoutez des photos avant/après.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {media.map(m => (
                      <div key={m.id} className="relative group rounded-lg overflow-hidden border border-border bg-muted aspect-square">
                        {m.signedUrl ? (
                          <img src={m.signedUrl} alt={m.alt_text || m.file_name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Image className="w-8 h-8 text-muted-foreground/30" /></div>
                        )}
                        <div className="absolute top-1 left-1">
                          <span className="text-[10px] bg-foreground/70 text-background px-1.5 py-0.5 rounded-full">
                            {MEDIA_ROLE_LABELS[m.media_role]}
                          </span>
                        </div>
                        <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors flex items-end justify-center">
                          <Button
                            variant="destructive"
                            size="sm"
                            className="mb-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                            onClick={() => deleteMedia.mutate(m)}
                          >
                            Supprimer
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Qualification */}
          <TabsContent value="qualification">
            <QualificationTab realisation={r} onUpdate={(data) => updateRealisation.mutate({ id: r.id, ...data })} />
          </TabsContent>

          {/* Tab 4: SEO */}
          <TabsContent value="seo">
            <SeoTab realisation={r} onUpdate={(data) => updateRealisation.mutate({ id: r.id, ...data })} />
          </TabsContent>

          {/* Tab 5: Validation */}
          <TabsContent value="validation">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Conformité</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Consentement publication</span>
                    <Badge variant={r.publication_consent ? 'default' : 'outline'}>{r.publication_consent ? 'Oui' : 'Non'}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Autorisation marketing</span>
                    <Badge variant={r.marketing_authorized ? 'default' : 'outline'}>{r.marketing_authorized ? 'Oui' : 'Non'}</Badge>
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-sm">Notes internes</Label>
                    <p className="text-sm text-muted-foreground mt-1">{r.internal_notes || 'Aucune note'}</p>
                  </div>
                  {r.rejection_reason && (
                    <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                      <Label className="text-sm text-destructive">Motif de refus</Label>
                      <p className="text-sm mt-1">{r.rejection_reason}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Actions</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Statut actuel: <StatusBadge status={r.validation_status} type="validation" /></Label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {r.validation_status !== 'approved' && (
                      <Button size="sm" onClick={() => changeValidation.mutate({ id: r.id, status: 'approved' })}>
                        <CheckCircle2 className="w-4 h-4 mr-1" /> Approuver
                      </Button>
                    )}
                    {r.validation_status !== 'rejected' && (
                      <>
                        <div className="w-full">
                          <Input placeholder="Motif de refus (optionnel)" value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} className="text-xs" />
                        </div>
                        <Button size="sm" variant="destructive" onClick={() => changeValidation.mutate({ id: r.id, status: 'rejected', reason: rejectionReason })}>
                          <XCircle className="w-4 h-4 mr-1" /> Refuser
                        </Button>
                      </>
                    )}
                    {r.validation_status !== 'archived' && (
                      <Button size="sm" variant="outline" onClick={() => changeValidation.mutate({ id: r.id, status: 'archived' })}>
                        <Archive className="w-4 h-4 mr-1" /> Archiver
                      </Button>
                    )}
                  </div>
                  <Separator />
                  <Label className="text-sm">Publication: <StatusBadge status={r.publication_status} type="publication" /></Label>
                  <div className="flex flex-wrap gap-2">
                    {(['internal_ready', 'web_ready', 'published'] as const).filter(s => s !== r.publication_status).map(status => (
                      <Button key={status} size="sm" variant="outline" onClick={() => changePub.mutate({ id: r.id, status })}>
                        <Globe className="w-4 h-4 mr-1" /> {PUBLICATION_STATUS_LABELS[status]}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab 6: History */}
          <TabsContent value="history">
            <Card>
              <CardHeader><CardTitle className="text-base">Historique des actions</CardTitle></CardHeader>
              <CardContent>
                {activityLog.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Aucun événement</p>
                ) : (
                  <div className="space-y-3">
                    {activityLog.map(log => (
                      <div key={log.id} className="flex items-start gap-3 border-l-2 border-border pl-4 pb-3">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{ACTION_TYPE_LABELS[log.action_type] || log.action_type}</p>
                          {log.actor_label && <p className="text-xs text-muted-foreground">par {log.actor_label}</p>}
                          <p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString('fr-FR')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Helpers
function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <p className="text-sm text-foreground">{value || <span className="text-muted-foreground">—</span>}</p>
    </div>
  );
}

function StatusBadge({ status, type }: { status: string; type: 'validation' | 'publication' }) {
  const labels = type === 'validation' ? VALIDATION_STATUS_LABELS : PUBLICATION_STATUS_LABELS;
  const colors = type === 'validation' ? VALIDATION_STATUS_COLORS : PUBLICATION_STATUS_COLORS;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${colors[status as keyof typeof colors] || 'bg-muted text-muted-foreground'}`}>
      {labels[status as keyof typeof labels] || status}
    </span>
  );
}

function ScoreCard({ title, result, icon: Icon, iconColor }: { title: string; result: ReturnType<typeof computeQualityScore>; icon: any; iconColor: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className={`w-5 h-5 ${iconColor}`} /> {title}
          <span className="ml-auto text-2xl font-bold">{result.score}/100</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {result.details.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            {d.met ? <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
            <span className={d.met ? 'text-foreground' : 'text-muted-foreground'}>{d.label}</span>
            <span className="ml-auto text-muted-foreground">{d.points}/{d.maxPoints}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// Qualification sub-tab
function QualificationTab({ realisation: r, onUpdate }: { realisation: any; onUpdate: (data: any) => void }) {
  const [form, setForm] = useState({
    service_family: r.service_family || '',
    service_type: r.service_type || '',
    chantier_type: r.chantier_type || '',
    client_type: r.client_type || '',
    context_intervention: r.context_intervention || '',
    problem_initial: r.problem_initial || '',
    solution_applied: r.solution_applied || '',
    materials_used: r.materials_used || '',
    differentiators: r.differentiators || '',
    approximate_duration: r.approximate_duration || '',
    client_benefit: r.client_benefit || '',
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Qualification métier</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Famille de service</Label>
            <select className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background mt-1" value={form.service_family} onChange={e => setForm(f => ({ ...f, service_family: e.target.value }))}>
              <option value="">Sélectionner</option>
              {SERVICE_FAMILIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div><Label className="text-xs">Service</Label><Input className="mt-1" value={form.service_type} onChange={e => setForm(f => ({ ...f, service_type: e.target.value }))} /></div>
          <div><Label className="text-xs">Type de chantier</Label><Input className="mt-1" value={form.chantier_type} onChange={e => setForm(f => ({ ...f, chantier_type: e.target.value }))} /></div>
          <div>
            <Label className="text-xs">Type de client</Label>
            <select className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background mt-1" value={form.client_type} onChange={e => setForm(f => ({ ...f, client_type: e.target.value }))}>
              <option value="">Sélectionner</option>
              {Object.entries(CLIENT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        <div><Label className="text-xs">Contexte d'intervention</Label><Textarea className="mt-1" value={form.context_intervention} onChange={e => setForm(f => ({ ...f, context_intervention: e.target.value }))} /></div>
        <div><Label className="text-xs">Problème initial</Label><Textarea className="mt-1" value={form.problem_initial} onChange={e => setForm(f => ({ ...f, problem_initial: e.target.value }))} /></div>
        <div><Label className="text-xs">Solution apportée</Label><Textarea className="mt-1" value={form.solution_applied} onChange={e => setForm(f => ({ ...f, solution_applied: e.target.value }))} /></div>
        <div><Label className="text-xs">Matériaux / équipements</Label><Input className="mt-1" value={form.materials_used} onChange={e => setForm(f => ({ ...f, materials_used: e.target.value }))} /></div>
        <div><Label className="text-xs">Points différenciants</Label><Textarea className="mt-1" value={form.differentiators} onChange={e => setForm(f => ({ ...f, differentiators: e.target.value }))} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label className="text-xs">Durée approximative</Label><Input className="mt-1" value={form.approximate_duration} onChange={e => setForm(f => ({ ...f, approximate_duration: e.target.value }))} /></div>
          <div><Label className="text-xs">Bénéfice client</Label><Input className="mt-1" value={form.client_benefit} onChange={e => setForm(f => ({ ...f, client_benefit: e.target.value }))} /></div>
        </div>
        <Button onClick={() => onUpdate(form)}>Enregistrer</Button>
      </CardContent>
    </Card>
  );
}

// SEO sub-tab
function SeoTab({ realisation: r, onUpdate }: { realisation: any; onUpdate: (data: any) => void }) {
  const [form, setForm] = useState({
    seo_city: r.seo_city || '',
    seo_target_query: r.seo_target_query || '',
    seo_article_angle: r.seo_article_angle || '',
    seo_suggested_title: r.seo_suggested_title || '',
    seo_meta_description: r.seo_meta_description || '',
    seo_slug: r.seo_slug || '',
    seo_internal_links: r.seo_internal_links || '',
    seo_cta: r.seo_cta || '',
    seo_secondary_keywords: r.seo_secondary_keywords || '',
    seo_faq: r.seo_faq || '',
    seo_ready: r.seo_ready || false,
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">SEO / Contenu</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><Label className="text-xs">Ville SEO principale</Label><Input className="mt-1" value={form.seo_city} onChange={e => setForm(f => ({ ...f, seo_city: e.target.value }))} /></div>
          <div><Label className="text-xs">Requête cible</Label><Input className="mt-1" value={form.seo_target_query} onChange={e => setForm(f => ({ ...f, seo_target_query: e.target.value }))} /></div>
        </div>
        <div><Label className="text-xs">Angle d'article</Label><Textarea className="mt-1" value={form.seo_article_angle} onChange={e => setForm(f => ({ ...f, seo_article_angle: e.target.value }))} /></div>
        <div><Label className="text-xs">Titre SEO suggéré</Label><Input className="mt-1" value={form.seo_suggested_title} onChange={e => setForm(f => ({ ...f, seo_suggested_title: e.target.value }))} /></div>
        <div><Label className="text-xs">Meta description</Label><Textarea className="mt-1" rows={3} value={form.seo_meta_description} onChange={e => setForm(f => ({ ...f, seo_meta_description: e.target.value }))} /></div>
        <div><Label className="text-xs">Slug suggéré</Label><Input className="mt-1" value={form.seo_slug} onChange={e => setForm(f => ({ ...f, seo_slug: e.target.value }))} /></div>
        <div><Label className="text-xs">Maillage interne cible</Label><Input className="mt-1" value={form.seo_internal_links} onChange={e => setForm(f => ({ ...f, seo_internal_links: e.target.value }))} /></div>
        <div><Label className="text-xs">CTA cible</Label><Input className="mt-1" value={form.seo_cta} onChange={e => setForm(f => ({ ...f, seo_cta: e.target.value }))} /></div>
        <div><Label className="text-xs">Mots-clés secondaires</Label><Input className="mt-1" value={form.seo_secondary_keywords} onChange={e => setForm(f => ({ ...f, seo_secondary_keywords: e.target.value }))} /></div>
        <div><Label className="text-xs">FAQ potentielle</Label><Textarea className="mt-1" rows={3} value={form.seo_faq} onChange={e => setForm(f => ({ ...f, seo_faq: e.target.value }))} /></div>
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={form.seo_ready} onChange={e => setForm(f => ({ ...f, seo_ready: e.target.checked }))} id="seo_ready" />
          <Label htmlFor="seo_ready" className="text-sm">Prêt à envoyer vers le site</Label>
        </div>
        <Button onClick={() => onUpdate(form)}>Enregistrer SEO</Button>
      </CardContent>
    </Card>
  );
}
