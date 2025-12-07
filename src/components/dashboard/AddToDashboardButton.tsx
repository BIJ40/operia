/**
 * AddToDashboardButton - Bouton contextuel pour ajouter un widget au dashboard
 */

import { useState } from 'react';
import { Plus, LayoutDashboard, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useWidgetTemplates, useUserWidgets, useAddWidget } from '@/hooks/useDashboard';
import { toast } from 'sonner';
import { WidgetType } from '@/types/dashboard';

interface AddToDashboardButtonProps {
  templateName: string;
  templateType: WidgetType;
  moduleSource: string;
  defaultParams?: Record<string, unknown>;
  icon?: string;
  minWidth?: number;
  minHeight?: number;
  defaultWidth?: number;
  defaultHeight?: number;
  variant?: 'default' | 'ghost' | 'outline' | 'icon';
  className?: string;
}

export function AddToDashboardButton({
  templateName,
  templateType,
  moduleSource,
  defaultParams = {},
  icon = 'BarChart3',
  minWidth = 2,
  minHeight = 2,
  defaultWidth = 4,
  defaultHeight = 4,
  variant = 'ghost',
  className = '',
}: AddToDashboardButtonProps) {
  const { data: templates } = useWidgetTemplates();
  const { data: userWidgets } = useUserWidgets();
  const addWidget = useAddWidget();
  const [isAdded, setIsAdded] = useState(false);

  // Vérifie si ce widget existe déjà dans le dashboard de l'utilisateur
  const existingTemplate = templates?.find(t => t.module_source === moduleSource);
  const isAlreadyAdded = existingTemplate && userWidgets?.some(w => w.template_id === existingTemplate.id);

  const handleAdd = async () => {
    if (isAlreadyAdded) {
      toast.info('Ce widget est déjà sur votre dashboard');
      return;
    }

    try {
      // Cherche ou crée le template
      let templateId = existingTemplate?.id;

      if (!templateId) {
        // Le template sera créé par le hook si nécessaire
        // Pour l'instant on utilise un template existant ou on le crée via mutation
        toast.error('Template non trouvé. Veuillez rafraîchir la page.');
        return;
      }

      // Trouve une position libre
      const occupiedPositions = new Set(
        userWidgets?.map(w => `${w.position_x},${w.position_y}`) || []
      );
      
      let posX = 0, posY = 0;
      const GRID_COLS = 12;
      
      // Recherche une position libre
      for (let y = 0; y < 20; y++) {
        for (let x = 0; x <= GRID_COLS - defaultWidth; x++) {
          const key = `${x},${y}`;
          if (!occupiedPositions.has(key)) {
            posX = x;
            posY = y;
            break;
          }
        }
        if (posX !== 0 || posY !== 0) break;
      }

      await addWidget.mutateAsync({
        templateId,
        position: { x: posX, y: posY },
      });
    } catch (error) {
      console.error('Erreur ajout widget:', error);
      toast.error('Impossible d\'ajouter le widget');
    }
  };

  if (variant === 'icon') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleAdd}
              disabled={addWidget.isPending}
              className={`h-8 w-8 ${isAlreadyAdded ? 'text-green-600' : ''} ${className}`}
            >
              {isAdded || isAlreadyAdded ? (
                <Check className="h-4 w-4" />
              ) : (
                <LayoutDashboard className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isAlreadyAdded ? 'Déjà sur le dashboard' : 'Ajouter au dashboard'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button
      variant={variant}
      size="sm"
      onClick={handleAdd}
      disabled={addWidget.isPending}
      className={`gap-2 ${isAlreadyAdded ? 'text-green-600' : ''} ${className}`}
    >
      {isAdded || isAlreadyAdded ? (
        <>
          <Check className="h-4 w-4" />
          Ajouté
        </>
      ) : (
        <>
          <Plus className="h-4 w-4" />
          Dashboard
        </>
      )}
    </Button>
  );
}
