import { useEffect, useState } from 'react';
import { Lightbulb, RefreshCw } from 'lucide-react';
import { DashboardWidget } from './DashboardWidget';
import { useEditor } from '@/contexts/EditorContext';
import { Button } from '@/components/ui/button';

interface TipOfTheDayWidgetProps {
  size?: 'small' | 'medium' | 'large';
  isConfigMode?: boolean;
  onRemove?: () => void;
}

export function TipOfTheDayWidget({ size = 'medium', isConfigMode, onRemove }: TipOfTheDayWidgetProps) {
  const { blocks } = useEditor();
  const [tip, setTip] = useState<{ title: string; content: string } | null>(null);

  const getRandomTip = () => {
    const tipsBlocks = blocks.filter(block => 
      block.contentType === 'tips' && block.content.trim().length > 0
    );

    if (tipsBlocks.length > 0) {
      const randomTip = tipsBlocks[Math.floor(Math.random() * tipsBlocks.length)];
      // Extraire le texte brut du HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = randomTip.content;
      const textContent = tempDiv.textContent || tempDiv.innerText || '';
      
      setTip({
        title: randomTip.title,
        content: textContent.slice(0, 200) + (textContent.length > 200 ? '...' : '')
      });
    }
  };

  useEffect(() => {
    getRandomTip();
  }, [blocks]);

  return (
    <DashboardWidget
      title="Astuce du jour"
      description="Une astuce utile pour vous aider"
      size={size}
      isConfigMode={isConfigMode}
      onRemove={onRemove}
    >
      {tip ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Lightbulb className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium mb-2">{tip.title}</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {tip.content}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={getRandomTip}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-2" />
            Autre astuce
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
          <Lightbulb className="h-8 w-8 mb-2 opacity-50" />
          <p className="text-sm">Aucune astuce disponible</p>
        </div>
      )}
    </DashboardWidget>
  );
}
