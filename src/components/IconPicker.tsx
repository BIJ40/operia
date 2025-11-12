import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, X } from 'lucide-react';
import { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const isCustomImage = value.startsWith('data:image/') || value.startsWith('http');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        onChange(base64String);
        setOpen(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveCustomIcon = () => {
    onChange('');
    setOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="w-full justify-start gap-2"
      >
        {isCustomImage ? (
          <>
            <img src={value} alt="Icône personnalisée" className="w-4 h-4 object-contain" />
            <span>Icône personnalisée</span>
          </>
        ) : (
          <span>{value || "Choisir une icône"}</span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Personnaliser l'icône</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">Importer une image</TabsTrigger>
              <TabsTrigger value="current">Image actuelle</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Choisir une image
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  PNG, JPG, SVG (max 2MB)
                </p>
              </div>

              <div className="text-xs text-muted-foreground">
                💡 Pour un meilleur résultat, utilisez des images carrées avec fond transparent (PNG)
              </div>
            </TabsContent>

            <TabsContent value="current" className="space-y-4">
              {isCustomImage ? (
                <div className="space-y-4">
                  <div className="border rounded-lg p-4 flex items-center justify-center bg-muted">
                    <img src={value} alt="Icône actuelle" className="w-24 h-24 object-contain" />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleRemoveCustomIcon}
                    className="w-full gap-2"
                  >
                    <X className="w-4 h-4" />
                    Supprimer l'icône personnalisée
                  </Button>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Aucune icône personnalisée définie
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
