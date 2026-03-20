/**
 * BdStoryStoryDetail — Vue détaillée d'une histoire générée
 */
import { useState } from 'react';
import { Copy, Check, FileJson } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BdStoryBoardPreview } from './BdStoryBoardPreview';
import { GeneratedStory } from '../types/bdStory.types';

interface Props {
  story: GeneratedStory;
  boardPrompt?: string | null;
}

export function BdStoryStoryDetail({ story, boardPrompt }: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">{story.title}</h2>
        <p className="text-sm text-muted-foreground">{story.summary}</p>
      </div>

      {/* Metadata pills */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Univers', value: story.universe },
          { label: 'Famille', value: story.storyFamily },
          { label: 'Template', value: story.templateKey },
          { label: 'Ton', value: story.tone },
          { label: 'Technicien', value: story.assignedCharacters.technician },
          { label: 'Client', value: story.clientProfileSlug },
        ].map(({ label, value }) => (
          <span key={label} className="text-xs px-2 py-1 rounded-md bg-muted/50 text-muted-foreground">
            <span className="font-medium text-foreground">{label}:</span> {value?.replace(/_/g, ' ')}
          </span>
        ))}
      </div>

      {/* Board preview */}
      <BdStoryBoardPreview panels={story.panels} title="Planche 12 cases" />

      {/* Board prompt */}
      {boardPrompt && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Prompt visuel maître</h3>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs h-7"
              onClick={() => copyText(boardPrompt, 'prompt')}
            >
              {copied === 'prompt' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied === 'prompt' ? 'Copié' : 'Copier'}
            </Button>
          </div>
          <pre className="text-xs bg-muted/30 border rounded-lg p-3 whitespace-pre-wrap font-mono leading-relaxed max-h-60 overflow-y-auto">
            {boardPrompt}
          </pre>
        </div>
      )}

      {/* JSON toggle */}
      <div className="pt-2 border-t">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => setShowJson(!showJson)}
        >
          <FileJson className="w-3.5 h-3.5" />
          {showJson ? 'Masquer JSON' : 'Voir JSON complet'}
        </Button>
        {showJson && (
          <div className="mt-3 relative">
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 h-7 text-xs gap-1"
              onClick={() => copyText(JSON.stringify(story, null, 2), 'json')}
            >
              {copied === 'json' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </Button>
            <pre className="text-[10px] bg-muted/20 border rounded-lg p-3 overflow-auto max-h-96 font-mono">
              {JSON.stringify(story, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
