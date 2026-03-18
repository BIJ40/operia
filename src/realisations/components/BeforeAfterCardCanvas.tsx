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
  plomberie:     { label: 'Plomberie',     bg: '#00B3EB', accent: '#0098D4', labelColor: '#E0F4FD' },
  chauffage:     { label: 'Chauffage',     bg: '#008DDF', accent: '#0077C0', labelColor: '#D6EEFF' },
  electricite:   { label: 'Électricité',   bg: '#FEAD04', accent: '#E09800', labelColor: '#FFF4D6' },
  climatisation: { label: 'Climatisation', bg: '#009CE3', accent: '#0082C0', labelColor: '#D6F0FF' },
  serrurerie:    { label: 'Serrurerie',    bg: '#F85A10', accent: '#D94A0A', labelColor: '#FFE4D6' },
  volets:        { label: 'Volets',        bg: '#53B730', accent: '#449926', labelColor: '#DDEFD6' },
  vitrerie:      { label: 'Vitrerie',      bg: '#1D51A7', accent: '#17428A', labelColor: '#D6DFEF' },
  menuiserie:    { label: 'Menuiserie',    bg: '#B8947C', accent: '#9A7A64', labelColor: '#EDE5DE' },
  general:       { label: 'Multi-services', bg: '#37474F', accent: '#263238', labelColor: '#CFD8DC' },
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

      // ── Top bar — Banner image (cover full width, proportional height)
      const bannerRatio = imgBanner.naturalWidth / imgBanner.naturalHeight;
      const bannerW = SIZE;
      const bannerH = Math.round(bannerW / bannerRatio);
      const topBarH = Math.min(bannerH, 200); // cap at 200px
      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, SIZE, topBarH);
      drawCover(ctx, imgBanner, 0, 0, SIZE, topBarH);
      ctx.restore();

      // ── Photos zone — Diagonal split (/ direction: AVANT bottom-left, APRÈS top-right)
      const photoY = topBarH + 10;
      const photoH = SIZE - topBarH - 10 - 120; // bottom bar = 120
      const photoW = SIZE;
      const margin = 20;

      // Full photo area
      const areaX = margin;
      const areaY = photoY;
      const areaW = photoW - margin * 2;
      const areaH = photoH;

      // Diagonal offset for gap (pixels to shift each side for the white diagonal gap)
      const gap = 6;

      // AVANT — bottom-left triangle (below the / diagonal)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(areaX, areaY + areaH);                          // bottom-left
      ctx.lineTo(areaX + areaW - gap, areaY + areaH);            // bottom-right (shifted)
      ctx.lineTo(areaX, areaY + gap);                             // top-left (shifted)
      ctx.closePath();
      ctx.clip();
      drawCover(ctx, imgAvant, areaX, areaY, areaW, areaH);
      // Label AVANT — bottom-left
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      roundRect(ctx, areaX + 20, areaY + areaH - 74, 160, 54, 12);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 30px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('AVANT', areaX + 100, areaY + areaH - 38);
      ctx.restore();

      // APRÈS — top-right triangle (above the / diagonal)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(areaX + areaW, areaY);                           // top-right
      ctx.lineTo(areaX + gap, areaY);                              // top-left (shifted)
      ctx.lineTo(areaX + areaW, areaY + areaH - gap);             // bottom-right (shifted)
      ctx.closePath();
      ctx.clip();
      drawCover(ctx, imgApres, areaX, areaY, areaW, areaH);
      // Label APRÈS — top-right
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      roundRect(ctx, areaX + areaW - 180, areaY + 20, 160, 54, 12);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 30px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('APRÈS', areaX + areaW - 100, areaY + 56);
      ctx.restore();

      // Diagonal separator line (white)
      ctx.save();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = gap * 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(areaX, areaY + areaH);
      ctx.lineTo(areaX + areaW, areaY);
      ctx.stroke();
      ctx.restore();

      // ── Bottom bar
      const bottomY = SIZE - 120;
      ctx.fillStyle = theme.accent;
      ctx.fillRect(0, bottomY, SIZE, 120);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 34px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(theme.label, 40, bottomY + 48);

      ctx.font = '24px sans-serif';
      ctx.fillStyle = theme.labelColor;
      ctx.fillText(tagline, 40, bottomY + 84);

      if (phone) {
        ctx.font = 'bold 30px sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'right';
        ctx.fillText(phone, SIZE - 40, bottomY + 68);
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
