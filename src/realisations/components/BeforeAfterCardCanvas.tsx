/**
 * BeforeAfterCardCanvas — Génère un visuel branded 1080×1080 Avant/Après
 * Utilise un <canvas> HTML pour dessiner en temps réel.
 */
import { useRef, useEffect, useState, useCallback } from 'react';
import { Download, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ─── Service color mapping ────────────────────────────────────
export interface ServiceTheme {
  label: string;
  bg: string;
  accent: string;
  labelColor: string;
}

export const SERVICE_THEMES: Record<string, ServiceTheme> = {
  plomberie: { label: 'Plomberie', bg: '#1565C0', accent: '#0D47A1', labelColor: '#BBDEFB' },
  serrurerie: { label: 'Serrurerie', bg: '#C62828', accent: '#B71C1C', labelColor: '#FFCDD2' },
  volets: { label: 'Volets', bg: '#2E7D32', accent: '#1B5E20', labelColor: '#C8E6C9' },
  chauffage: { label: 'Chauffage', bg: '#E65100', accent: '#BF360C', labelColor: '#FFE0B2' },
  electricite: { label: 'Électricité', bg: '#F9A825', accent: '#F57F17', labelColor: '#FFF9C4' },
  vitrerie: { label: 'Vitrerie', bg: '#00838F', accent: '#006064', labelColor: '#B2EBF2' },
  climatisation: { label: 'Climatisation', bg: '#5C6BC0', accent: '#3949AB', labelColor: '#C5CAE9' },
  general: { label: 'Multi-services', bg: '#37474F', accent: '#263238', labelColor: '#CFD8DC' },
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
      const [imgAvant, imgApres] = await Promise.all([loadImage(avantUrl), loadImage(apresUrl)]);
      let imgLogo: HTMLImageElement | null = null;
      if (logoUrl) {
        try { imgLogo = await loadImage(logoUrl); } catch { /* no logo */ }
      }

      // ── Background
      ctx.fillStyle = theme.bg;
      ctx.fillRect(0, 0, SIZE, SIZE);

      // ── Top bar (logo area) — 120px
      const topBarH = 120;
      if (imgLogo) {
        // White pill behind logo
        const logoH = 60;
        const logoW = Math.min((imgLogo.naturalWidth / imgLogo.naturalHeight) * logoH, 260);
        const lx = (SIZE - logoW - 40) / 2;
        const ly = (topBarH - logoH - 20) / 2;
        ctx.fillStyle = '#FFFFFF';
        roundRect(ctx, lx, ly, logoW + 40, logoH + 20, 14);
        ctx.fill();
        ctx.drawImage(imgLogo, lx + 20, ly + 10, logoW, logoH);
      } else {
        // Agency name fallback
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 42px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(agencyName, SIZE / 2, topBarH / 2 + 14);
      }

      // ── Service label top-right
      ctx.fillStyle = theme.labelColor;
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(theme.label, SIZE - 40, topBarH / 2 + 12);

      // ── Photos zone
      const photoY = topBarH + 10;
      const photoH = SIZE - topBarH - 10 - 120; // bottom bar = 120
      const photoW = (SIZE - 60) / 2; // 20 left + 20 gap + 20 right
      const radius = 16;

      // Avant
      ctx.save();
      roundRect(ctx, 20, photoY, photoW, photoH, radius);
      ctx.clip();
      drawCover(ctx, imgAvant, 20, photoY, photoW, photoH);
      // Label banner
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(20, photoY + photoH - 64, photoW, 64);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('AVANT', 20 + photoW / 2, photoY + photoH - 22);
      ctx.restore();

      // Après
      const apresX = 20 + photoW + 20;
      ctx.save();
      roundRect(ctx, apresX, photoY, photoW, photoH, radius);
      ctx.clip();
      drawCover(ctx, imgApres, apresX, photoY, photoW, photoH);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(apresX, photoY + photoH - 64, photoW, 64);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('APRÈS', apresX + photoW / 2, photoY + photoH - 22);
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
