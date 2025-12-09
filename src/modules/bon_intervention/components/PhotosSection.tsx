/**
 * Section photos du BI
 */

import { useState, useRef } from 'react';
import { Camera, Trash2, Plus, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhotoBI } from '../types';
import { cn } from '@/lib/utils';

interface PhotosSectionProps {
  photos: PhotoBI[];
  onChange: (photos: PhotoBI[]) => void;
}

export function PhotosSection({ photos, onChange }: PhotosSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const newPhoto: PhotoBI = {
          id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          dataUrl,
          timestamp: new Date().toISOString(),
        };
        onChange([...photos, newPhoto]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = (id: string) => {
    onChange(photos.filter((p) => p.id !== id));
    if (selectedPhoto === id) {
      setSelectedPhoto(null);
    }
  };

  const handleLegendChange = (id: string, legende: string) => {
    onChange(
      photos.map((p) => (p.id === id ? { ...p, legende } : p))
    );
  };

  return (
    <div className="space-y-4">
      {/* Grid photos */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className={cn(
                'relative group rounded-lg overflow-hidden border bg-muted',
                'aspect-square'
              )}
            >
              <img
                src={photo.dataUrl}
                alt={photo.legende || 'Photo'}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setSelectedPhoto(photo.id === selectedPhoto ? null : photo.id)}
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleRemove(photo.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
              {selectedPhoto === photo.id && (
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-background/90">
                  <Input
                    placeholder="Légende..."
                    value={photo.legende || ''}
                    onChange={(e) => handleLegendChange(photo.id, e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {photos.length === 0 && (
        <div className="border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground">
          <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucune photo ajoutée</p>
        </div>
      )}

      {/* Bouton ajout */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        className="w-full"
      >
        <Camera className="h-4 w-4 mr-2" />
        Ajouter une photo
      </Button>
    </div>
  );
}
