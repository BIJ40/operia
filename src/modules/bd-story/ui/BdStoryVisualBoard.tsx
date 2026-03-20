/**
 * BdStoryVisualBoard — Final comic board assembly
 * Supports 3×4 (12 panels) and 2×2 (4 panels premium) modes
 * Real BD bubbles with contours, tails, speech vs caption distinction
 */
import { useRef, useCallback, useState } from 'react';
import { Download, RefreshCw, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';
import type { BubbleStyle } from '../engine/panelRenderPlan';

interface PanelData {
  number: number;
  text: string;
  imageUrl?: string;
  status: 'success' | 'error' | 'pending' | 'idle';
  bubbleStyle?: BubbleStyle;
  bubbleSpeaker?: string | null;
}

interface Props {
  title: string;
  panels: PanelData[];
  onRegeneratePanel?: (panelNumber: number) => void;
  onRegenerateAll?: () => void;
  isGenerating?: boolean;
  mode?: '12' | '4';
  className?: string;
}

// ============================================================================
// BUBBLE POSITIONING
// ============================================================================

function getBubblePosition(panelNumber: number, totalPanels: number): {
  vertical: 'top' | 'bottom';
  horizontal: 'left' | 'center' | 'right';
  tailDirection: 'down' | 'up';
} {
  const cols = totalPanels === 4 ? 2 : 3;
  const row = Math.ceil(panelNumber / cols);
  const col = ((panelNumber - 1) % cols);

  const vertical = (row % 2 === 1) ? 'top' : 'bottom';
  const horizontals = cols === 2 ? ['left', 'right'] as const : ['left', 'center', 'right'] as const;
  const horizontal = horizontals[col] || 'center';
  const tailDirection = vertical === 'top' ? 'down' : 'up';

  return { vertical, horizontal, tailDirection };
}

// ============================================================================
// BD BUBBLE COMPONENT — Real comic bubble with contour and tail
// ============================================================================

function BdBubble({
  text,
  style = 'caption',
  speaker,
  panelNumber,
  totalPanels,
}: {
  text: string;
  style: BubbleStyle;
  speaker?: string | null;
  panelNumber: number;
  totalPanels: number;
}) {
  if (!text) return null;

  const pos = getBubblePosition(panelNumber, totalPanels);

  // Position classes
  const posClasses = cn(
    'absolute z-10 pointer-events-none',
    pos.vertical === 'top' ? 'top-2' : 'bottom-2',
    pos.horizontal === 'left' ? 'left-2 max-w-[80%]'
    : pos.horizontal === 'right' ? 'right-2 max-w-[80%]'
    : 'left-1/2 -translate-x-1/2 max-w-[85%]',
  );

  // Style-dependent rendering
  if (style === 'caption') {
    // Caption: rectangular box, no tail — narration off
    return (
      <div className={posClasses}>
        <div className="bg-amber-50 border-2 border-amber-900/70 px-2.5 py-1.5 shadow-sm"
          style={{ borderRadius: '2px' }}>
          <p className="text-[9px] sm:text-[11px] font-serif italic text-amber-950 leading-tight text-center">
            {text}
          </p>
        </div>
      </div>
    );
  }

  if (style === 'thought') {
    // Thought: cloud-shaped (simulated with very round border + cloud dots)
    return (
      <div className={posClasses}>
        <div className="bg-white border-2 border-foreground/80 rounded-[20px] px-3 py-1.5 shadow-sm relative">
          <p className="text-[9px] sm:text-[11px] font-medium text-foreground leading-tight text-center">
            {text}
          </p>
          {/* Cloud dots as tail */}
          <div className={cn(
            'absolute',
            pos.tailDirection === 'down'
              ? 'top-full left-4 flex flex-col items-start gap-0.5 pt-0.5'
              : 'bottom-full left-4 flex flex-col-reverse items-start gap-0.5 pb-0.5',
          )}>
            <div className="w-2 h-2 rounded-full bg-white border-2 border-foreground/80" />
            <div className="w-1.5 h-1.5 rounded-full bg-white border border-foreground/80 ml-1" />
          </div>
        </div>
      </div>
    );
  }

  // Speech bubble: white with black contour and triangular tail
  const tailHorizontalClass = pos.horizontal === 'left' ? 'left-4'
    : pos.horizontal === 'right' ? 'right-4'
    : 'left-1/2 -translate-x-1/2';

  return (
    <div className={posClasses}>
      <div className="bg-white border-2 border-foreground/90 rounded-[16px] px-3 py-1.5 shadow-sm relative">
        {/* Speaker label */}
        {speaker && (
          <p className="text-[7px] font-bold text-primary uppercase tracking-wider mb-0.5">
            {speaker === 'client' ? '👤' : speaker === 'amandine' ? '📞' : '🔧'}
          </p>
        )}
        <p className="text-[9px] sm:text-[11px] font-semibold text-foreground leading-tight text-center">
          {text}
        </p>
        {/* Triangular tail — SVG for clean rendering */}
        <div className={cn(
          'absolute',
          tailHorizontalClass,
          pos.tailDirection === 'down' ? 'top-full -mt-px' : 'bottom-full -mb-px rotate-180',
        )}>
          <svg width="14" height="10" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 0 L7 10 L12 0" fill="white" stroke="currentColor" strokeWidth="2"
              className="text-foreground/90" strokeLinejoin="round" />
            {/* Cover the top border line */}
            <rect x="2" y="0" width="10" height="2" fill="white" />
          </svg>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SINGLE PANEL CELL
// ============================================================================

function PanelCell({
  panel,
  totalPanels,
  onRegenerate,
}: {
  panel: PanelData;
  totalPanels: number;
  onRegenerate?: () => void;
}) {
  const hasImage = panel.status === 'success' && panel.imageUrl;
  const isPending = panel.status === 'pending';
  const isError = panel.status === 'error';

  return (
    <div className="relative aspect-square border-2 border-foreground/80 overflow-hidden group"
      style={{ borderRadius: '3px', backgroundColor: '#f5f0eb' }}>
      {/* Panel number — comic style */}
      <div className="absolute top-0.5 left-0.5 z-20 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-foreground text-background text-[8px] sm:text-[9px] font-black flex items-center justify-center">
        {panel.number}
      </div>

      {/* Image */}
      {hasImage ? (
        <img
          src={panel.imageUrl}
          alt={`Panel ${panel.number}`}
          className="w-full h-full object-cover"
          crossOrigin="anonymous"
        />
      ) : isPending ? (
        <div className="w-full h-full flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/40" />
        </div>
      ) : isError ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-destructive/5 gap-1">
          <ImageIcon className="w-5 h-5 text-destructive/40" />
          <span className="text-[8px] text-destructive/60">Erreur</span>
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <ImageIcon className="w-5 h-5 text-muted-foreground/20" />
        </div>
      )}

      {/* BD Bubble */}
      <BdBubble
        text={panel.text}
        style={panel.bubbleStyle || 'caption'}
        speaker={panel.bubbleSpeaker}
        panelNumber={panel.number}
        totalPanels={totalPanels}
      />

      {/* Regenerate on hover */}
      {onRegenerate && (
        <button
          onClick={(e) => { e.stopPropagation(); onRegenerate(); }}
          className="absolute top-0.5 right-0.5 z-20 w-5 h-5 rounded-full bg-background/80 text-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-background"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// ============================================================================
// MAIN BOARD COMPONENT
// ============================================================================

export function BdStoryVisualBoard({ title, panels, onRegeneratePanel, onRegenerateAll, isGenerating, mode = '12', className }: Props) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPNG = useCallback(async () => {
    if (!boardRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(boardRef.current, {
        backgroundColor: '#ffffff',
        scale: 3,
        useCORS: true,
        allowTaint: true,
      });
      const link = document.createElement('a');
      link.download = `bd-${mode === '4' ? 'premium' : 'story'}-${title.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  }, [title, mode]);

  const hasAnyImage = panels.some(p => p.status === 'success');
  const gridCols = mode === '4' ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          🎬 {mode === '4' ? 'BD Premium (4 cases)' : 'Planche BD (12 cases)'}
        </h3>
        <div className="flex gap-2">
          {onRegenerateAll && (
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7"
              onClick={onRegenerateAll} disabled={isGenerating}>
              <RefreshCw className={cn('w-3 h-3', isGenerating && 'animate-spin')} />
              Tout régénérer
            </Button>
          )}
          {hasAnyImage && (
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7"
              onClick={handleExportPNG} disabled={isExporting}>
              {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
              Export PNG
            </Button>
          )}
        </div>
      </div>

      {/* Board */}
      <div ref={boardRef} className="bg-white rounded-lg border-[3px] border-foreground/80 p-2 sm:p-3 shadow-md">
        {/* Title */}
        <div className="text-center mb-2 pb-1.5 border-b-2 border-foreground/20">
          <h2 className="text-xs sm:text-sm font-black text-foreground tracking-wide uppercase">{title}</h2>
        </div>

        {/* Grid */}
        <div className={cn('grid gap-1.5 sm:gap-2', gridCols)}>
          {panels.map((panel) => (
            <PanelCell
              key={panel.number}
              panel={panel}
              totalPanels={panels.length}
              onRegenerate={onRegeneratePanel ? () => onRegeneratePanel(panel.number) : undefined}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-2 pt-1.5 border-t-2 border-foreground/20">
          <span className="text-[9px] font-bold text-muted-foreground tracking-widest uppercase">
            HelpConfort — BD Story
          </span>
        </div>
      </div>
    </div>
  );
}
