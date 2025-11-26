import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface AvailableWidget {
  key: string;
  title: string;
  description: string;
  isEnabled: boolean;
}

interface WidgetMenuProps {
  widgets: AvailableWidget[];
  onToggleWidget: (widgetKey: string, enabled: boolean) => void;
}

export function WidgetMenu({ widgets, onToggleWidget }: WidgetMenuProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-4 right-4 z-50 gap-2 rounded-2xl border-2 border-primary/20 bg-background/80 backdrop-blur-sm hover:bg-accent hover:border-primary/40 shadow-lg"
        >
          <Plus className="w-4 h-4" />
          Widgets
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Gérer les widgets</SheetTitle>
          <SheetDescription>
            Activez ou désactivez les widgets à afficher sur votre tableau de bord
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-6 space-y-4">
          {widgets.map((widget) => (
            <div
              key={widget.key}
              className="flex items-start justify-between gap-4 p-4 border rounded-lg"
            >
              <div className="flex-1">
                <Label htmlFor={widget.key} className="font-semibold">
                  {widget.title}
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {widget.description}
                </p>
              </div>
              <Switch
                id={widget.key}
                checked={widget.isEnabled}
                onCheckedChange={(checked) => onToggleWidget(widget.key, checked)}
              />
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
