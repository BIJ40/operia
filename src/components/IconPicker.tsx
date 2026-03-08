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
  // Navigation & Interface
  'Home', 'Menu', 'Search', 'Settings', 'MoreVertical', 'MoreHorizontal',
  'ChevronRight', 'ChevronLeft', 'ChevronUp', 'ChevronDown', 'ArrowRight', 'ArrowLeft',
  'ArrowUp', 'ArrowDown', 'ArrowUpRight', 'ArrowDownLeft', 'ExternalLink', 'Link',
  'Grid', 'List', 'Layout', 'Sidebar', 'Columns', 'Rows',
  
  // Files & Documents
  'File', 'FileText', 'Files', 'Folder', 'FolderOpen', 'FolderPlus',
  'BookOpen', 'Book', 'Newspaper', 'FileImage', 'FileVideo', 'FileAudio',
  'FilePlus', 'FileMinus', 'FileCheck', 'FileX', 'Archive', 'Package',
  
  // Communication
  'Mail', 'Send', 'MessageCircle', 'MessageSquare', 'Phone', 'PhoneCall',
  'PhoneIncoming', 'PhoneOutgoing', 'Video', 'Mic', 'MicOff', 'Voicemail',
  'AtSign', 'Inbox', 'Share2', 'Reply', 'Forward', 'Rss',
  
  // Users & People
  'User', 'Users', 'UserCheck', 'UserPlus', 'UserMinus', 'UserX',
  'UserCircle', 'UsersRound', 'Contact', 'Badge', 'Smile', 'Laugh',
  
  // Actions & Controls
  'Plus', 'Minus', 'X', 'Check', 'CheckCircle', 'XCircle',
  'PlusCircle', 'MinusCircle', 'Edit', 'Edit2', 'Edit3', 'Save',
  'Trash', 'Trash2', 'Delete', 'Copy', 'Cut', 'Clipboard',
  'Download', 'Upload', 'RefreshCw', 'RotateCw', 'RotateCcw', 'Repeat',
  
  // Media & Entertainment
  'Play', 'Pause', 'StopCircle', 'SkipBack', 'SkipForward', 'FastForward',
  'Rewind', 'Music', 'Radio', 'Disc', 'Film', 'Image',
  'Camera', 'CameraOff', 'Volume2', 'VolumeX', 'Headphones', 'Podcast',
  
  // Time & Calendar
  'Calendar', 'Clock', 'Timer', 'AlarmClock', 'Watch', 'Hourglass',
  'CalendarDays', 'CalendarClock', 'CalendarCheck', 'CalendarX', 'History', 'TimerReset',
  
  // Location & Travel
  'MapPin', 'Map', 'Navigation', 'Compass', 'Globe', 'Locate',
  'Plane', 'Car', 'Bus', 'Train', 'Truck', 'Bike',
  'Ship', 'Anchor', 'Footprints', 'Milestone', 'Flag', 'MapPinned',
  
  // Business & Finance
  'Briefcase', 'Building', 'Building2', 'Store', 'Warehouse', 'Factory',
  'CreditCard', 'DollarSign', 'Euro', 'Banknote', 'Wallet', 'Receipt',
  'ShoppingCart', 'ShoppingBag', 'ShoppingBasket', 'Gift', 'Tag', 'Tags',
  
  // Charts & Analytics
  'BarChart', 'BarChart2', 'BarChart3', 'PieChart', 'LineChart', 'TrendingUp',
  'TrendingDown', 'Activity', 'Target', 'Award', 'Trophy', 'Medal',
  
  // Technology & Devices
  'Smartphone', 'Tablet', 'Monitor', 'Laptop', 'Computer', 'Keyboard',
  'Mouse', 'Printer', 'Scanner', 'Cpu', 'HardDrive', 'Server',
  'Database', 'Wifi', 'WifiOff', 'Bluetooth', 'Usb', 'Power',
  
  // Security & Privacy
  'Lock', 'Unlock', 'Key', 'Shield', 'ShieldCheck', 'ShieldAlert',
  'Eye', 'EyeOff', 'Fingerprint', 'Scan', 'ShieldQuestion', 'ShieldX',
  
  // Weather & Nature
  'Sun', 'Moon', 'Cloud', 'CloudRain', 'CloudSnow', 'CloudDrizzle',
  'CloudLightning', 'Wind', 'Droplet', 'Droplets', 'Snowflake',
  'Waves', 'Trees', 'Flower', 'Leaf', 'Bug', 'Bird',
  
  // Status & Alerts
  'Bell', 'BellOff', 'AlertCircle', 'AlertTriangle', 'Info', 'HelpCircle',
  'CheckCircle2', 'XOctagon', 'AlertOctagon', 'Construction', 'Siren',
  
  // Tools & Settings
  'Wrench', 'Settings2', 'Sliders', 'Tool', 'Hammer',
  'Paintbrush', 'Palette', 'Pipette', 'Scissors', 'Ruler', 'Pen',
  
  // Social & Sharing
  'Heart', 'Star', 'Bookmark', 'ThumbsUp', 'ThumbsDown', 'MessageHeart',
  'Github', 'Twitter', 'Facebook', 'Instagram', 'Linkedin', 'Youtube',
  
  // Health & Medical
  'HeartPulse', 'Pill', 'Syringe', 'Stethoscope',
  'Zap', 'Battery', 'BatteryCharging', 'BatteryFull', 'BatteryLow',
  
  // Food & Dining
  'Coffee', 'Pizza', 'Utensils', 'UtensilsCrossed', 'Cookie', 'Beef',
  'Cherry', 'Grape', 'Apple', 'Carrot', 'Fish', 'Egg',
  
  // Miscellaneous
  'Rocket', 'Sparkles', 'Flame', 'Lightbulb', 'Lamp',
  'Glasses', 'Shirt', 'Crown', 'Diamond', 'Gem',
  'Box', 'Boxes', 'Maximize', 'Minimize', 'Move', 'Grab',
];

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredIcons = commonIcons.filter(icon =>
    icon.toLowerCase().includes(search.toLowerCase())
  );

  const IconsMap = Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
  const CurrentIcon = IconsMap[value] || Icons.BookOpen;

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
                const Icon = IconsMap[iconName];
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