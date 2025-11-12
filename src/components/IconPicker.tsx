import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as Icons from 'lucide-react';

interface IconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
}

const commonIcons = [
  'BookOpen', 'FileText', 'Users', 'Settings', 'Home', 'Search',
  'Mail', 'Phone', 'Calendar', 'Clock', 'MapPin', 'Star',
  'Heart', 'Bookmark', 'Tag', 'Folder', 'File', 'Image',
  'Video', 'Music', 'Download', 'Upload', 'Share2', 'Link',
  'MessageCircle', 'MessageSquare', 'Send', 'Bell', 'AlertCircle', 'Info',
  'CheckCircle', 'XCircle', 'HelpCircle', 'PlusCircle', 'MinusCircle', 'Edit',
  'Trash2', 'Save', 'Copy', 'Cut', 'Clipboard', 'Printer',
  'Camera', 'Mic', 'Volume2', 'Play', 'Pause', 'StopCircle',
  'SkipBack', 'SkipForward', 'RefreshCw', 'RotateCw', 'ZoomIn', 'ZoomOut',
  'Maximize', 'Minimize', 'Menu', 'Grid', 'List', 'Layout',
  'Sidebar', 'Columns', 'Package', 'ShoppingCart', 'ShoppingBag', 'CreditCard',
  'DollarSign', 'TrendingUp', 'TrendingDown', 'BarChart', 'PieChart', 'Activity',
  'Award', 'Target', 'Flag', 'Zap', 'Sun', 'Moon',
  'Cloud', 'CloudRain', 'CloudSnow', 'Droplet', 'Wind', 'Thermometer',
  'Briefcase', 'Database', 'Server', 'HardDrive', 'Cpu', 'Monitor',
  'Smartphone', 'Tablet', 'Watch', 'Headphones', 'Wifi', 'Bluetooth',
  'Battery', 'Power', 'Lock', 'Unlock', 'Key', 'Shield',
  'Eye', 'EyeOff', 'UserCheck', 'UserPlus', 'UserMinus', 'UserX',
  'Navigation', 'Compass', 'Map', 'Globe', 'Anchor', 'Plane',
  'Truck', 'Train', 'Bus', 'Car', 'Bike', 'Rocket',
];

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredIcons = commonIcons.filter(icon =>
    icon.toLowerCase().includes(search.toLowerCase())
  );

  const CurrentIcon = (Icons as any)[value] || Icons.BookOpen;

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center">
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2"
        >
          <CurrentIcon className="w-4 h-4" />
          <span>{value}</span>
        </Button>
      </div>

      {isOpen && (
        <div className="border rounded-lg p-3 bg-background">
          <Input
            placeholder="Rechercher une icône..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-3"
          />
          <ScrollArea className="h-64">
            <div className="grid grid-cols-6 gap-2">
              {filteredIcons.map((iconName) => {
                const Icon = (Icons as any)[iconName];
                if (!Icon) return null;
                return (
                  <Button
                    key={iconName}
                    type="button"
                    variant={value === iconName ? "default" : "ghost"}
                    size="sm"
                    onClick={() => {
                      onChange(iconName);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className="h-10 w-full"
                    title={iconName}
                  >
                    <Icon className="w-5 h-5" />
                  </Button>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}