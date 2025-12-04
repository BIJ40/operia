// Bouton d'ajout de photo (mock pour prototype)

import { useRef } from 'react';
import { Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface AddPhotoButtonProps {
  onPhotoAdded: (url: string) => void;
}

export function AddPhotoButton({ onPhotoAdded }: AddPhotoButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Mock: create a local URL for the image
    // In production, this would upload to Supabase Storage
    const url = URL.createObjectURL(file);
    onPhotoAdded(url);
    toast.success('Photo ajoutée');

    // Reset input
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button 
        variant="outline" 
        size="sm"
        onClick={handleClick}
        className="gap-1"
      >
        <Camera className="h-4 w-4" />
        Ajouter photo
      </Button>
    </>
  );
}

export default AddPhotoButton;
