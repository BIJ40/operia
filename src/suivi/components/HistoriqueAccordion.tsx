import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { History } from 'lucide-react';
import { HistoriqueCompact } from './HistoriqueCompact';
import { SuiviEvent } from '@/suivi/lib/dataProcessing/suiviDataProcessor';

interface HistoriqueAccordionProps {
  events: SuiviEvent[];
}

export const HistoriqueAccordion: React.FC<HistoriqueAccordionProps> = ({ events }) => {
  return (
    <Accordion type="single" collapsible defaultValue="historique" className="w-full">
      <AccordionItem 
        value="historique" 
        className="group rounded-xl border-0 bg-card shadow-card
          transition-all duration-300 hover:shadow-card-hover px-4 overflow-hidden"
      >
        <AccordionTrigger className="hover:no-underline py-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-primary 
              flex items-center justify-center shadow-sm">
              <History className="h-4 w-4 md:h-5 md:w-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg md:text-2xl text-foreground leading-tight">
              HISTORIQUE DU DOSSIER
            </span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-4">
          <HistoriqueCompact events={events} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};
