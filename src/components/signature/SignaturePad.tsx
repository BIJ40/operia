/**
 * SignaturePad - Composant de signature tactile utilisant Fabric.js
 */

import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Canvas as FabricCanvas, PencilBrush } from 'fabric';
import { Button } from '@/components/ui/button';
import { Trash2, Undo2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SignaturePadRef {
  getSignatureData: () => string | null;
  clear: () => void;
  isEmpty: () => boolean;
}

export interface SignaturePadProps {
  onChange?: (isEmpty: boolean) => void;
  onConfirm?: (dataUrl: string) => void;
  width?: number | string;
  height?: number;
  strokeColor?: string;
  strokeWidth?: number;
  backgroundColor?: string;
  showControls?: boolean;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
  initialValue?: string;
}

export const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(({
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
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const [isEmptyState, setIsEmptyState] = useState(true);
  const [canUndo, setCanUndo] = useState(false);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    getSignatureData: () => {
      const canvas = fabricCanvasRef.current;
      if (!canvas || isEmptyState) return null;
      return canvas.toDataURL({ format: 'png', multiplier: 1 });
    },
    clear: () => handleClear(),
    isEmpty: () => isEmptyState,
  }), [isEmptyState]);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const containerWidth = containerRef.current.offsetWidth;
    const canvasWidth = typeof width === 'number' ? width : containerWidth;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: canvasWidth,
      height,
      backgroundColor,
      isDrawingMode: !readOnly,
      selection: false,
    });

    canvas.freeDrawingBrush = new PencilBrush(canvas);
    canvas.freeDrawingBrush.color = strokeColor;
    canvas.freeDrawingBrush.width = strokeWidth;
    fabricCanvasRef.current = canvas;

    if (initialValue) {
      const img = new Image();
      img.onload = () => {
        const ctx = canvas.getContext();
        ctx.drawImage(img, 0, 0);
        canvas.renderAll();
        setIsEmptyState(false);
      };
      img.src = initialValue;
    }

    const handlePathCreated = () => {
      setIsEmptyState(false);
      setCanUndo(true);
      onChange?.(false);
    };

    canvas.on('path:created', handlePathCreated);

    return () => {
      canvas.off('path:created', handlePathCreated);
      canvas.dispose();
    };
  }, [width, height, strokeColor, strokeWidth, backgroundColor, readOnly, initialValue]);

  const handleClear = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.clear();
    canvas.backgroundColor = backgroundColor;
    canvas.renderAll();
    setIsEmptyState(true);
    setCanUndo(false);
    onChange?.(true);
  }, [backgroundColor, onChange]);

  const handleUndo = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const objects = canvas.getObjects();
    if (objects.length > 0) {
      canvas.remove(objects[objects.length - 1]);
      canvas.renderAll();
      if (canvas.getObjects().length === 0) {
        setIsEmptyState(true);
        setCanUndo(false);
        onChange?.(true);
      }
    }
  }, [onChange]);

  const handleConfirm = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || isEmptyState) return;
    const dataUrl = canvas.toDataURL({ format: 'png', multiplier: 1 });
    onConfirm?.(dataUrl);
  }, [isEmptyState, onConfirm]);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div
        ref={containerRef}
        className={cn(
          'relative border-2 border-dashed rounded-lg overflow-hidden transition-colors',
          isEmptyState ? 'border-muted-foreground/30' : 'border-primary/50',
          readOnly && 'pointer-events-none opacity-75'
        )}
        style={{ width, height }}
      >
        <canvas ref={canvasRef} className="touch-none" />
        {isEmptyState && !readOnly && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-muted-foreground/50 text-lg select-none">{placeholder}</span>
          </div>
        )}
      </div>

      {showControls && !readOnly && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleClear} disabled={isEmptyState}>
              <Trash2 className="h-4 w-4 mr-1" />
              Effacer
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleUndo} disabled={!canUndo}>
              <Undo2 className="h-4 w-4 mr-1" />
              Annuler
            </Button>
          </div>
          {onConfirm && (
            <Button type="button" size="sm" onClick={handleConfirm} disabled={isEmptyState}>
              <Check className="h-4 w-4 mr-1" />
              Valider
            </Button>
          )}
        </div>
      )}
    </div>
  );
});

SignaturePad.displayName = 'SignaturePad';

export function useSignaturePadRef() {
  return useRef<SignaturePadRef>(null);
}
