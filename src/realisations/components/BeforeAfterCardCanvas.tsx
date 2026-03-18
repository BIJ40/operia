/**
 * BeforeAfterCardCanvas — Génère un visuel branded 1080×1080 Avant/Après
 * Utilise un <canvas> HTML pour dessiner en temps réel.
 */
import { useRef, useEffect, useState, useCallback } from 'react';
import { Download, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import bannerSrc from '@/assets/banniere_helpconfort.jpg';

// ─── Service color mapping ────────────────────────────────────
export interface ServiceTheme {
  label: string;
  bg: string;
  accent: string;
  labelColor: string;
}

export const SERVICE_THEMES: Record<string, ServiceTheme> = {
  plomberie:     { label: 'Plomberie',           bg: '#2D8BC9', accent: '#136AAD', labelColor: '#D6EEFF' },
  electricite:   { label: 'Électricité',         bg: '#F8A73C', accent: '#F68A30', labelColor: '#FFF4D6' },
  serrurerie:    { label: 'Serrurerie',          bg: '#E22673', accent: '#DF0E61', labelColor: '#FFD6E8' },
  menuiserie:    { label: 'Menuiserie',          bg: '#EF8531', accent: '#E86424', labelColor: '#FFE4D6' },
  vitrerie:      { label: 'Vitrerie',            bg: '#90C14E', accent: '#62B144', labelColor: '#E4F2D6' },
  volets:        { label: 'Volets roulants',     bg: '#A23189', accent: '#912982', labelColor: '#F0D6EC' },
  pmr:           { label: 'Adaptation logement', bg: '#3C64A2', accent: '#2650A6', labelColor: '#D6DFEF' },
  renovation:    { label: 'Rénovation',          bg: '#B79D84', accent: '#957E6E', labelColor: '#EDE5DE' },
  general:       { label: 'Multi-services',      bg: '#37474F', accent: '#263238', labelColor: '#CFD8DC' },
};

// ─── Canvas helpers ───────────────────────────────────────────
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Impossible de charger l'image`));
    img.src = src;
  });
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const boxRatio = w / h;
  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
  if (imgRatio > boxRatio) {
    sw = img.naturalHeight * boxRatio;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    sh = img.naturalWidth / boxRatio;
    sy = (img.naturalHeight - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

/** Draw image fully contained (letterboxed) without cropping */
function drawContain(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const boxRatio = w / h;
  let dw: number, dh: number, dx: number, dy: number;
  if (imgRatio > boxRatio) {
    dw = w;
    dh = w / imgRatio;
    dx = x;
    dy = y + (h - dh) / 2;
  } else {
    dh = h;
    dw = h * imgRatio;
    dx = x + (w - dw) / 2;
    dy = y;
  }
  ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, dx, dy, dw, dh);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── Props ────────────────────────────────────────────────────
interface BeforeAfterCardCanvasProps {
  avantUrl: string;
  apresUrl: string;
  serviceSlug: string;
  logoUrl?: string | null;
  agencyName?: string;
  tagline?: string;
  phone?: string;
  realisationId?: string;
  agencyId?: string;
  agencySlug?: string;
  agencyAddress?: string | null;
  agencyCity?: string | null;
  agencyPostalCode?: string | null;
  agencyPhone?: string | null;
  agencyEmail?: string | null;
  onCardSaved?: (url: string) => void;
}

const SIZE = 1080;

export function BeforeAfterCardCanvas({
  avantUrl,
  apresUrl,
  serviceSlug,
  logoUrl,
  agencyName = 'Help Confort',
  tagline = 'Dépannage & Travaux',
  phone = '',
  realisationId,
  agencyId,
  agencySlug,
  agencyAddress,
  agencyCity,
  agencyPostalCode,
  agencyPhone,
  agencyEmail,
  onCardSaved,
}: BeforeAfterCardCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendering, setIsRendering] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const theme = SERVICE_THEMES[serviceSlug] || SERVICE_THEMES.general;

  const render = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsRendering(true);
    try {
      const [imgAvant, imgApres, imgBanner] = await Promise.all([
        loadImage(avantUrl),
        loadImage(apresUrl),
        loadImage(bannerSrc),
      ]);

      // ── Background
      ctx.fillStyle = theme.bg;
      ctx.fillRect(0, 0, SIZE, SIZE);

      // ── Top bar — Banner with colored border around it
      const bannerRatio = imgBanner.naturalWidth / imgBanner.naturalHeight;
      const bannerPad = 12; // colored padding around the banner
      const bannerInnerW = SIZE - bannerPad * 2;
      const bannerInnerH = Math.round(bannerInnerW / bannerRatio);
      const topBarH = Math.min(bannerInnerH + bannerPad * 2, 260);
      // Colored background behind banner
      ctx.fillStyle = theme.bg;
      ctx.fillRect(0, 0, SIZE, topBarH);
      // White area for the banner itself
      const innerH = topBarH - bannerPad * 2;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(bannerPad, bannerPad, bannerInnerW, innerH);
      drawContain(ctx, imgBanner, bannerPad, bannerPad, bannerInnerW, innerH);

      // ── Photos zone — Two side-by-side images with diagonal white line overlay
      const photoY = topBarH + 10;
      const photoH = SIZE - topBarH - 10 - 140; // bottom bar = 140
      const gap = 16;
      const photoW = (SIZE - 40 - gap) / 2; // 20px margin each side + gap
      const radius = 16;

      // AVANT (left)
      ctx.save();
      roundRect(ctx, 20, photoY, photoW, photoH, radius);
      ctx.clip();
      drawCover(ctx, imgAvant, 20, photoY, photoW, photoH);
      // Label AVANT bottom
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(20, photoY + photoH - 56, photoW, 56);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 30px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('AVANT', 20 + photoW / 2, photoY + photoH - 18);
      ctx.restore();

      // APRÈS (right)
      const apresX = 20 + photoW + gap;
      ctx.save();
      roundRect(ctx, apresX, photoY, photoW, photoH, radius);
      ctx.clip();
      drawCover(ctx, imgApres, apresX, photoY, photoW, photoH);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(apresX, photoY + photoH - 56, photoW, 56);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 30px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('APRÈS', apresX + photoW / 2, photoY + photoH - 18);
      ctx.restore();


      // ── Bottom bar
      const bottomY = SIZE - 140;
      ctx.fillStyle = theme.accent;
      ctx.fillRect(0, bottomY, SIZE, 140);

      // Left side: service label + tagline
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 34px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(theme.label, 40, bottomY + 42);

      ctx.font = '22px sans-serif';
      ctx.fillStyle = theme.labelColor;
      ctx.fillText(tagline, 40, bottomY + 74);

      // Right side: agency signature
      ctx.textAlign = 'right';
      const sigX = SIZE - 40;
      let sigY = bottomY + 30;

      // Agency name (from slug, capitalized)
      const displayName = agencySlug
        ? `Help Confort ${agencySlug.charAt(0).toUpperCase() + agencySlug.slice(1).replace(/-/g, ' ')}`
        : agencyName;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(displayName, sigX, sigY);
      sigY += 26;

      // Address line
      const addressParts: string[] = [];
      if (agencyAddress) addressParts.push(agencyAddress);
      if (addressParts.length > 0) {
        ctx.font = '18px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillText(addressParts.join(', '), sigX, sigY);
        sigY += 22;
      }

      // City + postal code
      const cityLine = [agencyPostalCode, agencyCity].filter(Boolean).join(' ');
      if (cityLine) {
        ctx.font = '18px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillText(cityLine, sigX, sigY);
        sigY += 22;
      }

      // Phone + email
      const contactLine = [agencyPhone, agencyEmail].filter(Boolean).join(' — ');
      if (contactLine) {
        ctx.font = '18px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillText(contactLine, sigX, sigY);
      }
    } catch (err) {
      console.error('Canvas render error', err);
    } finally {
      setIsRendering(false);
    }
  }, [avantUrl, apresUrl, theme, logoUrl, agencyName, tagline, phone]);

  useEffect(() => { render(); }, [render]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `avant-apres-${serviceSlug}.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 0.92);
    link.click();
    toast.success('Image téléchargée');
  };

  const handleSave = async () => {
    if (!realisationId || !agencyId) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsSaving(true);
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('Blob generation failed')), 'image/jpeg', 0.92);
      });
      const fileName = `avant-apres-${Date.now()}.jpg`;
      const storagePath = `agency/${agencyId}/realisation/${realisationId}/cards/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from('realisations-private')
        .upload(storagePath, blob, { contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      // Save as a media with role 'cover'
      const db = supabase as any;
      await db.from('realisation_media').insert({
        realisation_id: realisationId,
        agency_id: agencyId,
        storage_path: storagePath,
        file_name: fileName,
        original_file_name: fileName,
        mime_type: 'image/jpeg',
        media_type: 'image',
        media_role: 'cover',
        sequence_order: 0,
        file_size_bytes: blob.size,
      });

      const { data: urlData } = await supabase.storage
        .from('realisations-private')
        .createSignedUrl(storagePath, 3600);

      toast.success('Visuel sauvegardé comme image de couverture');
      onCardSaved?.(urlData?.signedUrl || '');
    } catch (err: any) {
      toast.error(err.message || 'Erreur de sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative border border-border rounded-xl overflow-hidden bg-muted">
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          className="w-full h-auto"
        />
        {isRendering && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button onClick={handleDownload} disabled={isRendering} variant="outline" className="flex-1">
          <Download className="w-4 h-4 mr-2" />
          Télécharger
        </Button>
        {realisationId && agencyId && (
          <Button onClick={handleSave} disabled={isRendering || isSaving} className="flex-1">
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Sauvegarder comme couverture
          </Button>
        )}
      </div>
    </div>
  );
}
