/**
 * BeforeAfterGenerator — Sélection des photos Avant/Après + preview canvas
 * Auto-détecte les photos tagguées, permet override manuel, choix du service.
 */
import { useState, useMemo } from 'react';
import { Layers, Image, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { RealisationMedia } from '../types';
import { MEDIA_ROLE_LABELS } from '../types';
import { BeforeAfterCardCanvas, SERVICE_THEMES } from './BeforeAfterCardCanvas';

interface BeforeAfterGeneratorProps {
  media: RealisationMedia[];
  realisationId: string;
  agencyId: string;
  logoUrl?: string | null;
  agencyName?: string;
  phone?: string;
  onCardSaved?: (url: string) => void;
}

type SelectionStep = 'idle' | 'select-avant' | 'select-apres' | 'preview';

export function BeforeAfterGenerator({
  media,
  realisationId,
  agencyId,
  logoUrl,
  agencyName,
  phone,
  onCardSaved,
}: BeforeAfterGeneratorProps) {
  const [step, setStep] = useState<SelectionStep>('idle');
  const [avantMedia, setAvantMedia] = useState<RealisationMedia | null>(null);
  const [apresMedia, setApresMedia] = useState<RealisationMedia | null>(null);
  const [serviceSlug, setServiceSlug] = useState('general');
  const [isOpen, setIsOpen] = useState(false);

  // Auto-detect tagged photos
  const autoAvant = useMemo(() => media.find(m => m.media_role === 'before' && m.signedUrl), [media]);
  const autoApres = useMemo(() => media.find(m => m.media_role === 'after' && m.signedUrl), [media]);

  const hasEnoughPhotos = media.filter(m => m.signedUrl).length >= 2;
  const hasAutoSelection = !!autoAvant && !!autoApres;

  const handleOpen = () => {
    // Pre-fill with auto-detected
    if (autoAvant) setAvantMedia(autoAvant);
    if (autoApres) setApresMedia(autoApres);

    if (hasAutoSelection) {
      setStep('preview');
    } else if (autoAvant) {
      setStep('select-apres');
    } else {
      setStep('select-avant');
    }
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setStep('idle');
    setAvantMedia(null);
    setApresMedia(null);
  };

  const handleSelectPhoto = (m: RealisationMedia) => {
    if (step === 'select-avant') {
      setAvantMedia(m);
      if (apresMedia) {
        setStep('preview');
      } else {
        setStep('select-apres');
      }
    } else if (step === 'select-apres') {
      setApresMedia(m);
      setStep('preview');
    }
  };

  const handleReset = () => {
    setAvantMedia(null);
    setApresMedia(null);
    setStep('select-avant');
  };

  const handleCardSaved = (url: string) => {
    onCardSaved?.(url);
    handleClose();
  };

  if (!hasEnoughPhotos) return null;

  const photosWithUrl = media.filter(m => m.signedUrl);

  // Filter photos by relevant role when selecting
  const getFilteredPhotos = () => {
    if (step === 'select-avant') {
      const avantPhotos = photosWithUrl.filter(m => m.media_role === 'before');
      return avantPhotos.length > 0 ? avantPhotos : photosWithUrl;
    }
    if (step === 'select-apres') {
      const apresPhotos = photosWithUrl.filter(m => m.media_role === 'after');
      return apresPhotos.length > 0 ? apresPhotos : photosWithUrl;
    }
    return photosWithUrl;
  };

  return (
    <>
      <Button onClick={handleOpen} variant="outline" size="sm" className="gap-2">
        <Layers className="w-4 h-4" />
        Générer visuel Avant/Après
      </Button>

      <Dialog open={isOpen} onOpenChange={v => !v && handleClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              Visuel Avant / Après
            </DialogTitle>
          </DialogHeader>

          {/* Service selector */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Service :</span>
            <Select value={serviceSlug} onValueChange={setServiceSlug}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SERVICE_THEMES).map(([slug, t]) => (
                  <SelectItem key={slug} value={slug}>
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ background: t.bg }} />
                      {t.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selection indicators */}
          <div className="flex gap-3">
            <SelectionBadge
              label="AVANT"
              media={avantMedia}
              isActive={step === 'select-avant'}
              onClick={() => { setAvantMedia(null); setStep('select-avant'); }}
            />
            <SelectionBadge
              label="APRÈS"
              media={apresMedia}
              isActive={step === 'select-apres'}
              onClick={() => { setApresMedia(null); setStep('select-apres'); }}
            />
          </div>

          {/* Photo selection grid */}
          {(step === 'select-avant' || step === 'select-apres') && (
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                {step === 'select-avant'
                  ? 'Cliquez sur la photo AVANT :'
                  : 'Cliquez sur la photo APRÈS :'}
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {photosWithUrl.map(m => {
                  const isSelected = m.id === avantMedia?.id || m.id === apresMedia?.id;
                  const isDisabled = (step === 'select-apres' && m.id === avantMedia?.id)
                    || (step === 'select-avant' && m.id === apresMedia?.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => !isDisabled && handleSelectPhoto(m)}
                      disabled={isDisabled}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        isSelected
                          ? 'border-primary ring-2 ring-primary/30'
                          : isDisabled
                          ? 'border-border opacity-40 cursor-not-allowed'
                          : 'border-border hover:border-primary/50 cursor-pointer'
                      }`}
                    >
                      <img src={m.signedUrl} alt="" className="w-full h-full object-cover" />
                      {m.media_role && ['before', 'during', 'after'].includes(m.media_role) && (
                        <span className="absolute top-1 left-1 text-[10px] font-bold bg-black/60 text-white px-1.5 py-0.5 rounded">
                          {MEDIA_ROLE_LABELS[m.media_role]}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Canvas preview */}
          {step === 'preview' && avantMedia?.signedUrl && apresMedia?.signedUrl && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Aperçu du visuel</p>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  Changer les photos
                </Button>
              </div>
              <BeforeAfterCardCanvas
                avantUrl={avantMedia.signedUrl}
                apresUrl={apresMedia.signedUrl}
                serviceSlug={serviceSlug}
                logoUrl={logoUrl}
                agencyName={agencyName}
                phone={phone}
                realisationId={realisationId}
                agencyId={agencyId}
                onCardSaved={handleCardSaved}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Sub-component ────────────────────────────────────────────
function SelectionBadge({
  label,
  media,
  isActive,
  onClick,
}: {
  label: string;
  media: RealisationMedia | null;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors flex-1 ${
        isActive
          ? 'border-primary bg-primary/10 text-primary'
          : media
          ? 'border-border bg-card text-foreground'
          : 'border-dashed border-border text-muted-foreground'
      }`}
    >
      {media?.signedUrl ? (
        <img src={media.signedUrl} alt="" className="w-8 h-8 rounded object-cover" />
      ) : (
        <Image className="w-4 h-4" />
      )}
      <span>{label}</span>
      {media && (
        <X className="w-3 h-3 ml-auto text-muted-foreground" />
      )}
    </button>
  );
}
