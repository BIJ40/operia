import { useEffect, useRef, useState } from 'react';
import { Canvas as FabricCanvas, FabricImage } from 'fabric';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { RotateCw, ZoomIn, ZoomOut, Save, X, Move, Maximize2 } from 'lucide-react';
import { toast } from 'sonner';

interface ImageEditorProps {
  open: boolean;
  onClose: () => void;
  imageUrl: string;
  onSave?: (newImageUrl: string) => void;
}

export const ImageEditor = ({ open, onClose, imageUrl, onSave }: ImageEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [rotation, setRotation] = useState(0);
  const [scale, setScale] = useState(1);
  const [activeTool, setActiveTool] = useState<'move' | 'crop'>('move');
  const fabricImageRef = useRef<FabricImage | null>(null);

  // Initialiser le canvas quand le dialog s'ouvre
  useEffect(() => {
    if (!open || !canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: '#f5f5f5',
    });

    setFabricCanvas(canvas);

    // Charger l'image
    FabricImage.fromURL(imageUrl, {
      crossOrigin: 'anonymous',
    }).then((img) => {
      if (!img) return;
      
      fabricImageRef.current = img;
      
      // Centrer et adapter l'image
      const canvasWidth = canvas.width || 800;
      const canvasHeight = canvas.height || 600;
      const imgWidth = img.width || 1;
      const imgHeight = img.height || 1;
      
      const scaleX = (canvasWidth * 0.8) / imgWidth;
      const scaleY = (canvasHeight * 0.8) / imgHeight;
      const initialScale = Math.min(scaleX, scaleY);
      
      img.scale(initialScale);
      img.set({
        left: canvasWidth / 2,
        top: canvasHeight / 2,
        originX: 'center',
        originY: 'center',
      });
      
      canvas.add(img);
      canvas.renderAll();
      setScale(initialScale);
    }).catch((error) => {
      console.error('Error loading image:', error);
      toast.error('Erreur lors du chargement de l\'image');
    });

    return () => {
      canvas.dispose();
    };
  }, [open, imageUrl]);

  const handleRotate = () => {
    if (!fabricImageRef.current || !fabricCanvas) return;
    
    const newRotation = (rotation + 90) % 360;
    setRotation(newRotation);
    fabricImageRef.current.rotate(newRotation);
    fabricCanvas.renderAll();
  };

  const handleZoomIn = () => {
    if (!fabricImageRef.current || !fabricCanvas) return;
    
    const newScale = scale * 1.2;
    setScale(newScale);
    fabricImageRef.current.scale(newScale);
    fabricCanvas.renderAll();
  };

  const handleZoomOut = () => {
    if (!fabricImageRef.current || !fabricCanvas) return;
    
    const newScale = scale * 0.8;
    setScale(newScale);
    fabricImageRef.current.scale(newScale);
    fabricCanvas.renderAll();
  };

  const handleSave = () => {
    if (!fabricCanvas) return;

    try {
      // Exporter le canvas comme image
      const dataURL = fabricCanvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 1,
      });
      
      if (onSave) {
        onSave(dataURL);
      }
      
      toast.success('Image sauvegardée');
      onClose();
    } catch (error) {
      console.error('Error saving image:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleReset = () => {
    setRotation(0);
    setScale(1);
    
    if (!fabricImageRef.current || !fabricCanvas) return;
    
    fabricImageRef.current.rotate(0);
    
    const canvasWidth = fabricCanvas.width || 800;
    const canvasHeight = fabricCanvas.height || 600;
    const imgWidth = fabricImageRef.current.width || 1;
    const imgHeight = fabricImageRef.current.height || 1;
    
    const scaleX = (canvasWidth * 0.8) / imgWidth;
    const scaleY = (canvasHeight * 0.8) / imgHeight;
    const resetScale = Math.min(scaleX, scaleY);
    
    fabricImageRef.current.scale(resetScale);
    fabricImageRef.current.set({
      left: canvasWidth / 2,
      top: canvasHeight / 2,
    });
    
    setScale(resetScale);
    fabricCanvas.renderAll();
    toast.success('Image réinitialisée');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-hidden" aria-describedby="image-editor-description">
        <DialogHeader>
          <DialogTitle>Éditeur d'image</DialogTitle>
          <p id="image-editor-description" className="sr-only">
            Éditez votre image avec les outils de rotation, zoom et recadrage
          </p>
        </DialogHeader>
        
        <div className="flex flex-col gap-4">
          {/* Barre d'outils */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTool('move')}
              className={activeTool === 'move' ? 'bg-accent' : ''}
            >
              <Move className="h-4 w-4 mr-2" />
              Déplacer
            </Button>
            
            <div className="h-6 w-px bg-border" />
            
            <Button variant="outline" size="sm" onClick={handleRotate}>
              <RotateCw className="h-4 w-4 mr-2" />
              Rotation
            </Button>
            
            <Button variant="outline" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4 mr-2" />
              Zoom +
            </Button>
            
            <Button variant="outline" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4 mr-2" />
              Zoom -
            </Button>
            
            <div className="h-6 w-px bg-border" />
            
            <Button variant="outline" size="sm" onClick={handleReset}>
              <Maximize2 className="h-4 w-4 mr-2" />
              Réinitialiser
            </Button>
          </div>

          {/* Canvas */}
          <div className="border border-border rounded-lg overflow-hidden bg-muted">
            <canvas ref={canvasRef} />
          </div>

          {/* Contrôles de zoom */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground min-w-[80px]">
              Zoom: {Math.round(scale * 100)}%
            </span>
            <Slider
              value={[scale * 100]}
              onValueChange={([value]) => {
                const newScale = value / 100;
                setScale(newScale);
                if (fabricImageRef.current && fabricCanvas) {
                  fabricImageRef.current.scale(newScale);
                  fabricCanvas.renderAll();
                }
              }}
              min={10}
              max={300}
              step={5}
              className="flex-1"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Annuler
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
