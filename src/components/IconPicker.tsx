import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import * as Icons from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
}

// Liste des icônes les plus courantes
const commonIcons = [
  'Home', 'Users', 'FileText', 'Folder', 'Calendar', 'Clock', 'Bell',
  'Mail', 'Phone', 'MapPin', 'Settings', 'Tool', 'Wrench', 'Package',
  'ShoppingCart', 'CreditCard', 'DollarSign', 'TrendingUp', 'BarChart',
  'PieChart', 'Award', 'Star', 'Heart', 'ThumbsUp', 'MessageCircle',
  'Search', 'Filter', 'Download', 'Upload', 'Eye', 'Edit', 'Trash',
  'Plus', 'Minus', 'Check', 'X', 'AlertCircle', 'Info', 'HelpCircle',
  'Building', 'Briefcase', 'Clipboard', 'BookOpen', 'GraduationCap',
  'Lightbulb', 'Zap', 'Target', 'Flag', 'Key', 'Lock', 'Shield',
  'AlertTriangle', 'CheckCircle', 'XCircle', 'Activity', 'Database',
];

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredIcons = commonIcons.filter(icon =>
    icon.toLowerCase().includes(search.toLowerCase())
  );

  const CurrentIcon = (Icons as any)[value] || Icons.Circle;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="w-full justify-start gap-2"
      >
        <CurrentIcon className="w-4 h-4" />
        <span>{value}</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Choisir une icône</DialogTitle>
          </DialogHeader>

          <Input
            placeholder="Rechercher une icône..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-4"
          />

          <div className="grid grid-cols-6 gap-2">
            {filteredIcons.map((iconName) => {
              const IconComponent = (Icons as any)[iconName];
              const isSelected = value === iconName;

              return (
                <Button
                  key={iconName}
                  type="button"
                  variant={isSelected ? 'default' : 'ghost'}
                  className="h-16 flex flex-col items-center justify-center gap-1"
                  onClick={() => {
                    onChange(iconName);
                    setOpen(false);
                  }}
                >
                  <IconComponent className="w-6 h-6" />
                  <span className="text-xs truncate max-w-full">{iconName}</span>
                </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
