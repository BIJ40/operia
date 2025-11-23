import { ColorPreset } from '@/types/block';

interface ColorPickerProps {
  value: ColorPreset;
  onChange: (color: ColorPreset) => void;
}

export const ColorPicker = ({ value, onChange }: ColorPickerProps) => {
  const colorPresets: { value: ColorPreset; className: string }[] = [
    { value: 'red', className: 'bg-red-500' },
    { value: 'blanc', className: 'bg-white border-2 border-gray-300' },
    { value: 'blue', className: 'bg-blue-500' },
    { value: 'green', className: 'bg-gradient-to-r from-helpconfort-blue-light to-helpconfort-blue-dark border-2 border-accent' },
    { value: 'yellow', className: 'bg-yellow-400' },
    { value: 'purple', className: 'bg-purple-500' },
    { value: 'orange', className: 'bg-orange-500' },
    { value: 'pink', className: 'bg-pink-500' },
    { value: 'cyan', className: 'bg-cyan-500' },
    { value: 'indigo', className: 'bg-indigo-500' },
    { value: 'teal', className: 'bg-teal-500' },
    { value: 'rose', className: 'bg-rose-500' },
    { value: 'gray', className: 'bg-gray-500' },
  ];

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Couleur</label>
      <div className="flex flex-wrap gap-2">
        {colorPresets.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => onChange(preset.value)}
            className={`w-8 h-8 rounded-full ${preset.className} ${
              value === preset.value 
                ? 'ring-2 ring-primary ring-offset-2' 
                : 'hover:ring-2 hover:ring-muted-foreground hover:ring-offset-2'
            } transition-all`}
            title={preset.value}
          />
        ))}
      </div>
    </div>
  );
};
