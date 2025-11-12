import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Home, Users, FileText, Folder, Calendar, Clock, Bell,
  Mail, Phone, MapPin, Settings, Hammer, Wrench, Package,
  ShoppingCart, CreditCard, DollarSign, TrendingUp, BarChart,
  PieChart, Award, Star, Heart, ThumbsUp, MessageCircle,
  Search, Filter, Download, Upload, Eye, Edit, Trash,
  Plus, Minus, Check, X, AlertCircle, Info, HelpCircle,
  Building, Briefcase, Clipboard, BookOpen, GraduationCap,
  Lightbulb, Zap, Target, Flag, Key, Lock, Shield,
  AlertTriangle, CheckCircle, XCircle, Activity, Database, Circle, Edit3, Square,
  type LucideIcon
} from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
}

// Map des icônes disponibles
const iconMap: Record<string, LucideIcon> = {
  Home, Users, FileText, Folder, Calendar, Clock, Bell,
  Mail, Phone, MapPin, Settings, Hammer, Wrench, Package,
  ShoppingCart, CreditCard, DollarSign, TrendingUp, BarChart,
  PieChart, Award, Star, Heart, ThumbsUp, MessageCircle,
  Search, Filter, Download, Upload, Eye, Edit, Trash,
  Plus, Minus, Check, X, AlertCircle, Info, HelpCircle,
  Building, Briefcase, Clipboard, BookOpen, GraduationCap,
  Lightbulb, Zap, Target, Flag, Key, Lock, Shield,
  AlertTriangle, CheckCircle, XCircle, Activity, Database, Circle, Edit3, Square
};

const commonIcons = Object.keys(iconMap);

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredIcons = commonIcons.filter(icon =>
    icon.toLowerCase().includes(search.toLowerCase())
  );

  const CurrentIcon = iconMap[value] || Circle;

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
              const IconComponent = iconMap[iconName];
              const isSelected = value === iconName;
              
              if (!IconComponent) return null;

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
