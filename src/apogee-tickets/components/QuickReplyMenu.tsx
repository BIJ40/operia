/**
 * Menu de suggestions de réponses rapides pour les tickets
 * Propose des modèles contextuels selon le type de ticket
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { MessageSquareText, Bug, Lightbulb, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickReplyTemplate {
  id: string;
  label: string;
  icon: React.ReactNode;
  category: 'bug' | 'feature' | 'general';
  getMessage: (context: QuickReplyContext) => string;
}

interface QuickReplyContext {
  /** Prénom/nom du demandeur si disponible */
  requesterName?: string;
  /** Référence du ticket (APO-xxx) */
  ticketRef?: string;
  /** Sujet du ticket */
  subject?: string;
}

interface QuickReplyMenuProps {
  context: QuickReplyContext;
  onSelect: (message: string) => void;
  className?: string;
}

const TEMPLATES: QuickReplyTemplate[] = [
  {
    id: 'bug-ack',
    label: 'Accusé de réception – Bug',
    icon: <Bug className="w-3.5 h-3.5 text-destructive" />,
    category: 'bug',
    getMessage: (ctx) =>
      `Bonjour${ctx.requesterName ? ` ${ctx.requesterName}` : ''},\n\nNous avons bien pris en compte votre remontée de bug${ctx.subject ? ` concernant "${ctx.subject}"` : ''} et vous en remercions.\n\nNous sommes actuellement sur le sujet et ne manquerons pas de vous tenir informé(e) de l'évolution.\n\nCordialement,\nL'équipe Support Apogée / Help!Confort`,
  },
  {
    id: 'feature-ack',
    label: 'Accusé de réception – Demande',
    icon: <Lightbulb className="w-3.5 h-3.5 text-amber-500" />,
    category: 'feature',
    getMessage: (ctx) =>
      `Bonjour${ctx.requesterName ? ` ${ctx.requesterName}` : ''},\n\nNous avons bien reçu votre demande${ctx.subject ? ` concernant "${ctx.subject}"` : ''} et nous vous remercions pour cette suggestion.\n\nVotre retour a été transmis à l'équipe en charge, qui l'étudiera dans les meilleurs délais. Nous reviendrons vers vous dès que nous aurons plus d'informations.\n\nCordialement,\nL'équipe Support Apogée / Help!Confort`,
  },
  {
    id: 'general-ack',
    label: 'Accusé de réception – Général',
    icon: <HelpCircle className="w-3.5 h-3.5 text-primary" />,
    category: 'general',
    getMessage: (ctx) =>
      `Bonjour${ctx.requesterName ? ` ${ctx.requesterName}` : ''},\n\nNous avons bien reçu votre message${ctx.subject ? ` concernant "${ctx.subject}"` : ''} et nous vous en remercions.\n\nNous revenons vers vous dans les plus brefs délais.\n\nCordialement,\nL'équipe Support Apogée / Help!Confort`,
  },
];

export function QuickReplyMenu({ context, onSelect, className }: QuickReplyMenuProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (template: QuickReplyTemplate) => {
    onSelect(template.getMessage(context));
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("gap-1.5 text-xs text-muted-foreground hover:text-foreground", className)}
          title="Réponses rapides"
        >
          <MessageSquareText className="w-3.5 h-3.5" />
          Réponses rapides
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-1.5" side="top">
        <div className="space-y-0.5">
          <p className="text-xs font-medium text-muted-foreground px-2 py-1">
            Sélectionnez un modèle
          </p>
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => handleSelect(tpl)}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm text-left hover:bg-accent transition-colors"
            >
              {tpl.icon}
              <span>{tpl.label}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
