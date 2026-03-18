/**
 * VisualsGallery — Grid of all generated before/after visuals
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, ExternalLink, Image, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useGeneratedVisuals } from '../hooks/useGeneratedVisuals';

export function VisualsGallery() {
  const navigate = useNavigate();
  const { data: visuals = [], isLoading } = useGeneratedVisuals();
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState('');

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-lg" />)}
      </div>
    );
  }

  if (visuals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
          <Image className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">Aucun visuel généré pour le moment.</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Créez des visuels Avant/Après depuis une réalisation.</p>
      </div>
    );
  }

  const handleDownload = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      // fallback
      window.open(url, '_blank');
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {visuals.map(v => (
          <div key={v.id} className="group relative rounded-lg overflow-hidden border border-border/50 bg-card">
            <button
              onClick={() => { setLightboxUrl(v.signedUrl); setLightboxTitle(v.realisation_title); }}
              className="w-full"
            >
              <div className="aspect-square">
                <img
                  src={v.signedUrl}
                  alt={`Visuel ${v.realisation_title}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            </button>
            <div className="px-2 py-1.5 flex items-center justify-between gap-1">
              <button
                onClick={() => navigate(`/realisations/${v.realisation_id}`)}
                className="text-xs text-muted-foreground truncate hover:text-foreground transition-colors"
              >
                {v.realisation_title}
              </button>
              <button
                onClick={() => handleDownload(v.signedUrl, v.file_name)}
                className="shrink-0 p-1 rounded hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Download className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={lightboxUrl}
              alt={lightboxTitle}
              className="w-full rounded-lg shadow-2xl"
            />
            <p className="text-white/70 text-sm text-center mt-3">{lightboxTitle}</p>
          </div>
        </div>
      )}
    </>
  );
}
