/**
 * Flow Question Renderer
 * Renders flow block fields based on their type
 */
import { useState } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Camera, X } from 'lucide-react';
import type { BlockFieldSchema } from '@/lib/flow/flowTypes';

interface FlowFieldRendererProps {
  field: BlockFieldSchema;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
  disabled?: boolean;
}

export function FlowFieldRenderer({
  field,
  value,
  onChange,
  disabled = false,
}: FlowFieldRendererProps) {
  const handleChange = (newValue: unknown) => {
    onChange(field.key, newValue);
  };

  switch (field.type) {
    case 'text':
      return (
        <div className="space-y-2">
          <Label htmlFor={field.key}>
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <Input
            id={field.key}
            type="text"
            value={(value as string) || ''}
            onChange={(e) => handleChange(e.target.value)}
            maxLength={field.maxLength}
            disabled={disabled}
            placeholder={`Saisir ${field.label.toLowerCase()}`}
          />
          {field.maxLength && (
            <p className="text-xs text-muted-foreground">
              {((value as string) || '').length} / {field.maxLength}
            </p>
          )}
        </div>
      );

    case 'number':
      return (
        <div className="space-y-2">
          <Label htmlFor={field.key}>
            {field.label}
            {field.unit && <span className="text-muted-foreground ml-1">({field.unit})</span>}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <Input
            id={field.key}
            type="number"
            value={value !== undefined ? String(value) : ''}
            onChange={(e) => handleChange(e.target.value ? Number(e.target.value) : undefined)}
            min={field.min}
            max={field.max}
            disabled={disabled}
          />
        </div>
      );

    case 'boolean':
      return (
        <div className="flex items-center space-x-3 py-2">
          <Checkbox
            id={field.key}
            checked={Boolean(value)}
            onCheckedChange={(checked) => handleChange(checked)}
            disabled={disabled}
          />
          <Label htmlFor={field.key} className="cursor-pointer">
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
        </div>
      );

    case 'select':
      return (
        <div className="space-y-2">
          <Label htmlFor={field.key}>
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <Select
            value={(value as string) || ''}
            onValueChange={handleChange}
            disabled={disabled}
          >
            <SelectTrigger id={field.key}>
              <SelectValue placeholder="Sélectionner..." />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case 'image':
      return <ImageFieldRenderer field={field} value={value} onChange={handleChange} disabled={disabled} />;

    case 'signature':
      return (
        <div className="space-y-2">
          <Label>
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <div className="border rounded-lg p-4 bg-muted/50 text-center text-muted-foreground">
            <p className="text-sm">Signature non implémentée (à venir)</p>
          </div>
        </div>
      );

    case 'date':
      return (
        <div className="space-y-2">
          <Label htmlFor={field.key}>
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <Input
            id={field.key}
            type="date"
            value={(value as string) || ''}
            onChange={(e) => handleChange(e.target.value)}
            disabled={disabled}
          />
        </div>
      );

    case 'time':
      return (
        <div className="space-y-2">
          <Label htmlFor={field.key}>
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <Input
            id={field.key}
            type="time"
            value={(value as string) || ''}
            onChange={(e) => handleChange(e.target.value)}
            disabled={disabled}
          />
        </div>
      );

    default:
      return (
        <div className="text-muted-foreground text-sm">
          Type de champ non supporté: {field.type}
        </div>
      );
  }
}

// Image field with camera capture
function ImageFieldRenderer({
  field,
  value,
  onChange,
  disabled,
}: {
  field: BlockFieldSchema;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}) {
  const [preview, setPreview] = useState<string | null>((value as string) || null);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit
    if (field.maxSize && file.size > field.maxSize * 1024 * 1024) {
      toast.error(`Fichier trop volumineux (max ${field.maxSize} MB)`);
      return;
    }

    // Convert to base64 for offline storage
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setPreview(base64);
      onChange(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleClear = () => {
    setPreview(null);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <Label>
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      
      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="Capture"
            className="w-full max-h-64 object-contain rounded-lg border"
          />
          {!disabled && (
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={handleClear}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
          <Camera className="h-10 w-10 text-muted-foreground mb-2" />
          <span className="text-sm text-muted-foreground">Prendre une photo</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleCapture}
            disabled={disabled}
          />
        </label>
      )}
      
      {field.maxSize && (
        <p className="text-xs text-muted-foreground">Max {field.maxSize} MB</p>
      )}
    </div>
  );
}
