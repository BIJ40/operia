import { Button } from '@/components/ui/button';
import { BookOpen, Users, Building2, HelpCircle, Headphones } from 'lucide-react';

export type ChatContext = 'apogee' | 'apporteurs' | 'helpconfort' | 'autre';

interface ChatContextSelectorProps {
  selectedContext: ChatContext;
  onSelectContext: (context: ChatContext) => void;
  onContactSupport?: () => void;
  isCreatingTicket?: boolean;
}

const contexts = [
  { 
    id: 'apogee' as ChatContext, 
    label: 'Apogée', 
    description: 'CRM & logiciel métier',
    icon: BookOpen,
    color: 'text-helpconfort-blue'
  },
  { 
    id: 'apporteurs' as ChatContext, 
    label: 'Apporteurs', 
    description: 'Partenaires & prescripteurs',
    icon: Users,
    color: 'text-green-600'
  },
  { 
    id: 'helpconfort' as ChatContext, 
    label: 'HelpConfort', 
    description: 'Réseau & procédures',
    icon: Building2,
    color: 'text-orange-500'
  },
  { 
    id: 'autre' as ChatContext, 
    label: 'Autre', 
    description: 'Questions générales',
    icon: HelpCircle,
    color: 'text-muted-foreground'
  },
];

export function ChatContextSelector({
  selectedContext,
  onSelectContext,
  onContactSupport,
  isCreatingTicket,
}: ChatContextSelectorProps) {
  return (
    <div className="px-3 py-2 border-b bg-muted/30">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
          Contexte de recherche
        </p>
        {onContactSupport && (
          <button
            onClick={onContactSupport}
            disabled={isCreatingTicket}
            className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 hover:underline disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Headphones className="w-3 h-3" />
            <span>{isCreatingTicket ? '...' : 'Support'}</span>
          </button>
        )}
      </div>
      <div className="flex gap-1">
        {contexts.map((ctx) => {
          const Icon = ctx.icon;
          const isSelected = selectedContext === ctx.id;
          return (
            <Button
              key={ctx.id}
              variant={isSelected ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onSelectContext(ctx.id)}
              className={`
                flex-1 h-auto py-1.5 px-2 flex flex-col items-center gap-0.5 
                ${isSelected 
                  ? 'bg-helpconfort-blue hover:bg-helpconfort-blue/90 text-white' 
                  : 'hover:bg-muted'
                }
              `}
              title={ctx.description}
            >
              <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : ctx.color}`} />
              <span className="text-[10px] font-medium leading-tight">{ctx.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
