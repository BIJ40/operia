import { useEffect, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker - use a more reliable CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

interface FilePreviewProps {
  src: string;
  filename: string;
}

export function FilePreview({ src, filename }: FilePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fileExtension = filename?.split('.').pop()?.toLowerCase() || '';
  
  useEffect(() => {
    const generatePreview = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Check if it's an image
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExtension)) {
          setPreviewUrl(src);
          setIsLoading(false);
          return;
        }
        
        // Check if it's a PDF
        if (fileExtension === 'pdf') {
          try {
            const loadingTask = pdfjsLib.getDocument({
              url: src,
              cMapUrl: `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/cmaps/`,
              cMapPacked: true,
            });
            
            const pdf = await loadingTask.promise;
            const page = await pdf.getPage(1);
            
            const scale = 1.0;
            const viewport = page.getViewport({ scale });
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            if (!context) {
              throw new Error('Could not get canvas context');
            }
            
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            await page.render({
              canvasContext: context,
              viewport: viewport,
            }).promise;
            
            setPreviewUrl(canvas.toDataURL());
          } catch (pdfError) {
            console.error('Error generating PDF preview:', pdfError);
            setError('PDF preview not available');
          }
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error generating preview:', error);
        setError('Preview not available');
        setIsLoading(false);
      }
    };
    
    generatePreview();
  }, [src, fileExtension]);
  
  const displayExtension = fileExtension.toUpperCase();
  
  return (
    <a
      href={src}
      download={filename}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-border rounded-lg hover:border-primary hover:bg-accent transition-all max-w-xs group"
    >
      <div className="w-32 h-32 bg-muted rounded flex items-center justify-center overflow-hidden">
        {isLoading ? (
          <div className="animate-pulse flex flex-col items-center gap-2">
            <span className="text-2xl">⏳</span>
            <span className="text-xs text-muted-foreground">Chargement...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2">
            <span className="text-3xl">📎</span>
            <span className="text-xs font-bold text-primary">{displayExtension}</span>
          </div>
        ) : previewUrl ? (
          <img 
            src={previewUrl} 
            alt={filename}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <span className="text-3xl">📎</span>
            <span className="text-xs font-bold text-primary">{displayExtension}</span>
          </div>
        )}
      </div>
      <div className="text-center">
        <div className="text-sm text-foreground group-hover:text-primary transition-colors truncate max-w-[200px] font-medium">
          {filename}
        </div>
        <div className="text-xs text-muted-foreground">{displayExtension}</div>
      </div>
    </a>
  );
}