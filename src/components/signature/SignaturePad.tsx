/**
 * SignaturePad - Composant de signature tactile utilisant Fabric.js
 * 
 * Permet de capturer une signature manuscrite sur écran tactile ou souris.
 * Exporte la signature en data:image/png base64.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, PencilBrush } from 'fabric';
import { Button } from '@/components/ui/button';
import { Trash2, Undo2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SignaturePadProps {
  /** Callback appelé quand la signature change */
  onChange?: (dataUrl: string | null) => void;
  /** Callback appelé quand l'utilisateur valide la signature */
  onConfirm?: (dataUrl: string) => void;
  /** Largeur du canvas (default: 100%) */
  width?: number | string;
  /** Hauteur du canvas (default: 200px) */
  height?: number;
  /** Couleur du trait (default: #000000) */
  strokeColor?: string;
  /** Épaisseur du trait (default: 2) */
  strokeWidth?: number;
  /** Couleur de fond (default: white) */
  backgroundColor?: string;
  /** Afficher les contrôles (clear, undo, confirm) */
  showControls?: boolean;
  /** Texte placeholder affiché quand vide */
  placeholder?: string;
  /** Classes CSS additionnelles */
  className?: string;
  /** Mode lecture seule */
  readOnly?: boolean;
  /** Signature initiale (data URL) */
  initialValue?: string;
}

export function SignaturePad({
  onChange,
  onConfirm,
  width = '100%',
  height = 200,
  strokeColor = '#000000',
  strokeWidth = 2,
  backgroundColor = '#ffffff',
  showControls = true,
  placeholder = 'Signez ici',
  className,
  readOnly = false,
  initialValue,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [canUndo, setCanUndo] = useState(false);
  const historyRef = useRef<string[]>([]);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const containerWidth = containerRef.current.offsetWidth;
    const canvasWidth = typeof width === 'number' ? width : containerWidth;
    const canvasHeight = height;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor,
      isDrawingMode: !readOnly,
      selection: false,
    });

    // Configure brush
    canvas.freeDrawingBrush = new PencilBrush(canvas);
    canvas.freeDrawingBrush.color = strokeColor;
    canvas.freeDrawingBrush.width = strokeWidth;

    fabricCanvasRef.current = canvas;

    // Load initial value if provided
    if (initialValue) {
      const img = new Image();
      img.onload = () => {
        const ctx = canvas.getContext();
        ctx.drawImage(img, 0, 0);
        canvas.renderAll();
        setIsEmpty(false);
      };
      img.src = initialValue;
    }

    // Track drawing
    const handlePathCreated = () => {
      setIsEmpty(false);
      setCanUndo(true);
      
      // Save to history
      const dataUrl = canvas.toDataURL({ format: 'png', multiplier: 1 });
      historyRef.current.push(dataUrl);
      
      onChange?.(dataUrl);
    };

    canvas.on('path:created', handlePathCreated);

    // Handle resize
    const handleResize = () => {
      if (containerRef.current) {
        const newWidth = typeof width === 'number' ? width : containerRef.current.offsetWidth;
        canvas.setDimensions({ width: newWidth, height: canvasHeight });
        canvas.renderAll();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      canvas.off('path:created', handlePathCreated);
      window.removeEventListener('resize', handleResize);
      canvas.dispose();
    };
  }, [width, height, strokeColor, strokeWidth, backgroundColor, readOnly, initialValue, onChange]);

  // Clear canvas
  const handleClear = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.clear();
    canvas.backgroundColor = backgroundColor;
    canvas.renderAll();
    
    setIsEmpty(true);
    setCanUndo(false);
    historyRef.current = [];
    
    onChange?.(null);
  }, [backgroundColor, onChange]);

  // Undo last stroke
  const handleUndo = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const objects = canvas.getObjects();
    if (objects.length > 0) {
      canvas.remove(objects[objects.length - 1]);
      canvas.renderAll();
      
      historyRef.current.pop();
      
      if (canvas.getObjects().length === 0) {
        setIsEmpty(true);
        setCanUndo(false);
        onChange?.(null);
      } else {
        const dataUrl = canvas.toDataURL({ format: 'png', multiplier: 1 });
        onChange?.(dataUrl);
      }
    }
  }, [onChange]);

  // Confirm signature
  const handleConfirm = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || isEmpty) return;

    const dataUrl = canvas.toDataURL({ format: 'png', multiplier: 1 });
    onConfirm?.(dataUrl);
  }, [isEmpty, onConfirm]);

  // Get current signature as data URL
  const getSignatureDataUrl = useCallback((): string | null => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || isEmpty) return null;
    return canvas.toDataURL({ format: 'png', multiplier: 1 });
  }, [isEmpty]);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div
        ref={containerRef}
        className={cn(
          'relative border-2 border-dashed rounded-lg overflow-hidden transition-colors',
          isEmpty ? 'border-muted-foreground/30' : 'border-primary/50',
          readOnly && 'pointer-events-none opacity-75'
        )}
        style={{ width, height }}
      >
        <canvas ref={canvasRef} className="touch-none" />
        
        {/* Placeholder */}
        {isEmpty && !readOnly && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-muted-foreground/50 text-lg select-none">
              {placeholder}
            </span>
          </div>
        )}
      </div>

      {/* Controls */}
      {showControls && !readOnly && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClear}
              disabled={isEmpty}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Effacer
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUndo}
              disabled={!canUndo}
            >
              <Undo2 className="h-4 w-4 mr-1" />
              Annuler
            </Button>
          </div>
          
          {onConfirm && (
            <Button
              type="button"
              size="sm"
              onClick={handleConfirm}
              disabled={isEmpty}
            >
              <Check className="h-4 w-4 mr-1" />
              Valider
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Export utility for external access to signature data
export function useSignaturePadRef() {
  const ref = useRef<{ getSignatureDataUrl: () => string | null }>(null);
  return ref;
}
