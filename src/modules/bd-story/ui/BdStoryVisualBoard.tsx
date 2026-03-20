/**
 * BdStoryVisualBoard — Final comic board assembly (3×4 grid)
 * Renders generated images with speech bubble overlays
 */
import { useRef, useCallback, useState } from 'react';
import { Download, RefreshCw, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PanelRenderResult } from '../engine/imageRenderService';
import html2canvas from 'html2canvas';

interface Props {
  title: string;
  panels: Array<{
    number: number;
    text: string;
    imageUrl?: string;
    status: 'success' | 'error' | 'pending' | 'idle';
  }>;
  onRegeneratePanel?: (panelNumber: number) => void;
  onRegenerateAll?: () => void;
  isGenerating?: boolean;
  className?: string;
}

// Speech bubble component
function SpeechBubble({ text, position = 'bottom' }: { text: string; position?: 'top' | 'bottom' }) {
  if (!text) return null;
  return (
    <div className={cn(
      'absolute left-2 right-2 z-10 pointer-events-none',
      position === 'top' ? 'top-1.5' : 'bottom-1.5'
    )}>
      <div className="bg-white/95 backdrop-blur-sm rounded-xl px-2.5 py-1.5 shadow-md border border-border/30 relative">
        <p className="text-[10px] sm:text-xs font-medium text-foreground leading-tight text-center">
          {text}
        </p>
        {/* Bubble tail */}
        <div className={cn(
          'absolute left-1/2 -translate-x-1/2 w-0 h-0',
          position === 'top'
            ? 'top-full border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-white/95'
            : 'bottom-full border-l-[6px] border-r-[6px] border-b-[6px] border-transparent border-b-white/95'
        )} />
      </div>
    </div>
  );
}

// Single panel cell
function PanelCell({ 
  panel, 
  onRegenerate 
}: { 
  panel: Props['panels'][number]; 
  onRegenerate?: () => void;
}) {
  const hasImage = panel.status === 'success' && panel.imageUrl;
  const isPending = panel.status === 'pending';
  const isError = panel.status === 'error';

  // Choose bubble position based on panel narrative position
  const bubblePosition = panel.number <= 4 ? 'bottom' : panel.number >= 9 ? 'top' : 'bottom';

  return (
    <div className="relative aspect-square bg-muted/20 border border-border/50 rounded-md overflow-hidden group">
      {/* Panel number badge */}
      <div className="absolute top-1 left-1 z-20 w-5 h-5 rounded-full bg-foreground/80 text-background text-[9px] font-bold flex items-center justify-center">
        {panel.number}
      </div>

      {/* Image or placeholder */}
      {hasImage ? (
        <img 
          src={panel.imageUrl} 
          alt={`Panel ${panel.number}`}
          className="w-full h-full object-cover"
          crossOrigin="anonymous"
        />
      ) : isPending ? (
        <div className="w-full h-full flex items-center justify-center bg-muted/30">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/50" />
        </div>
      ) : isError ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-destructive/5 gap-1">
          <ImageIcon className="w-5 h-5 text-destructive/40" />
          <span className="text-[9px] text-destructive/60">Erreur</span>
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-muted/10 gap-1">
          <ImageIcon className="w-5 h-5 text-muted-foreground/30" />
          <span className="text-[9px] text-muted-foreground/40">En attente</span>
        </div>
      )}

      {/* Speech bubble */}
      <SpeechBubble text={panel.text} position={bubblePosition} />

      {/* Regenerate button on hover */}
      {onRegenerate && (
        <button
          onClick={(e) => { e.stopPropagation(); onRegenerate(); }}
          className="absolute top-1 right-1 z-20 w-6 h-6 rounded-full bg-background/80 text-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-background"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

export function BdStoryVisualBoard({ title, panels, onRegeneratePanel, onRegenerateAll, isGenerating, className }: Props) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPNG = useCallback(async () => {
    if (!boardRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(boardRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });
      const link = document.createElement('a');
      link.download = `bd-story-${title.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  }, [title]);

  const hasAnyImage = panels.some(p => p.status === 'success');

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">🎬 Planche BD finale</h3>
        <div className="flex gap-2">
          {onRegenerateAll && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-7"
              onClick={onRegenerateAll}
              disabled={isGenerating}
            >
              <RefreshCw className={cn('w-3 h-3', isGenerating && 'animate-spin')} />
              Tout régénérer
            </Button>
          )}
          {hasAnyImage && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-7"
              onClick={handleExportPNG}
              disabled={isExporting}
            >
              {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
              Export PNG
            </Button>
          )}
        </div>
      </div>

      {/* Board: 3 cols × 4 rows */}
      <div 
        ref={boardRef}
        className="bg-white rounded-xl border-2 border-border/60 p-3 shadow-sm"
      >
        {/* Title bar */}
        <div className="text-center mb-3 pb-2 border-b border-border/30">
          <h2 className="text-sm font-bold text-foreground">{title}</h2>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 gap-2">
          {panels.map((panel) => (
            <PanelCell
              key={panel.number}
              panel={panel}
              onRegenerate={onRegeneratePanel ? () => onRegeneratePanel(panel.number) : undefined}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-3 pt-2 border-t border-border/30">
          <span className="text-[10px] text-muted-foreground">© HelpConfort — BD Story</span>
        </div>
      </div>
    </div>
  );
}
