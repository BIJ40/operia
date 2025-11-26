import { LayoutGrid } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';

interface AvailableWidget {
  key: string;
  title: string;
  description: string;
  isEnabled: boolean;
  isPinned: boolean;
}

interface WidgetsPanelButtonProps {
  widgets: AvailableWidget[];
  onToggleWidget: (widgetKey: string, enabled: boolean) => void;
}

export function WidgetsPanelButton({ widgets, onToggleWidget }: WidgetsPanelButtonProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed top-20 right-4 z-50 h-10 w-10 rounded-full border-2 border-primary/20 bg-background/95 backdrop-blur-sm hover:bg-accent hover:border-primary/40 shadow-lg"
        >
          <LayoutGrid className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Personnaliser le tableau de bord</SheetTitle>
          <SheetDescription>
            Activez ou désactivez les widgets pour personnaliser votre interface
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Widgets disponibles</h3>
            {widgets.filter(w => w.isPinned).map((widget) => (
              <div
                key={widget.key}
                className="flex items-start justify-between gap-4 p-4 border rounded-lg mb-2 hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <Label htmlFor={widget.key} className="font-semibold cursor-pointer">
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

          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground flex items-center gap-2">
              <span>Widgets épinglés depuis le site</span>
              <Badge variant="secondary" className="text-xs">Bientôt</Badge>
            </h3>
            <p className="text-sm text-muted-foreground">
              Vous pourrez bientôt épingler des statistiques et graphiques depuis n'importe quelle page du site pour les ajouter à votre tableau de bord.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
