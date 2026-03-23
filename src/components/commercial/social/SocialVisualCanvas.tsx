/**
 * SocialVisualCanvas — Moteur de rendu visuel social 1080×1080.
 * V3 — "Ad-Ready" : chaque visuel est une créa publicitaire prête à poster.
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { SIZE } from './templates/canvasHelpers';
import { resolveSocialTemplate, type SocialTemplateId } from './templateResolver';
import { drawRealisationCard } from './templates/drawRealisationCard';
import { drawTipCard } from './templates/drawTipCard';
import { drawAwarenessCard } from './templates/drawAwarenessCard';
import { drawBrandCard } from './templates/drawBrandCard';
import { drawEducationalCard } from './templates/drawEducationalCard';

export interface SocialTemplatePayload {
  title: string;
  caption: string;
  universe?: string | null;
  platform?: string | null;
  date?: string;
  mediaUrl?: string | null;
  /** Hook publicitaire — 3 à 6 mots, affiché GROS dans le visuel */
  hook?: string | null;
  /** Call-to-action — texte du bouton ("Demandez un devis", etc.) */
  cta?: string | null;
  /** Topic type — used to determine badge label for 'general' universe */
  topicType?: string | null;
  /** Show team avatars in visual (for brand/prospection posts) */
  showTeam?: boolean;
}

interface SocialVisualCanvasProps {
  payload: SocialTemplatePayload;
  templateId: SocialTemplateId;
  onRendered?: (canvas: HTMLCanvasElement) => void;
}

const TEMPLATE_RENDERERS: Record<SocialTemplateId, (ctx: CanvasRenderingContext2D, p: SocialTemplatePayload) => Promise<void>> = {
  realisation_card: drawRealisationCard,
  tip_card: drawTipCard,
  awareness_card: drawAwarenessCard,
  brand_card: drawBrandCard,
  educational_card: drawEducationalCard,
};

export function SocialVisualCanvas({ payload, templateId, onRendered }: SocialVisualCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendering, setIsRendering] = useState(true);

  const render = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsRendering(true);
    try {
      ctx.clearRect(0, 0, SIZE, SIZE);
      const renderer = TEMPLATE_RENDERERS[templateId] || TEMPLATE_RENDERERS.brand_card;
      await renderer(ctx, payload);
      onRendered?.(canvas);
    } catch (err) {
      console.error('SocialVisualCanvas render error:', err);
    } finally {
      setIsRendering(false);
    }
  }, [payload, templateId, onRendered]);

  useEffect(() => { render(); }, [render]);

  return (
    <div className="relative rounded-lg overflow-hidden border border-border bg-muted">
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        className="w-full h-auto"
      />
      {isRendering && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

/** Exporte le canvas en Blob PNG */
export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Canvas blob generation failed')),
      'image/png'
    );
  });
}
