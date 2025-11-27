import * as Icons from 'lucide-react';
import { Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import helpConfortServicesImg from '@/assets/help-confort-services.png';
import { HomeCard, getIconComponent } from './types';

interface UnauthenticatedGridProps {
  homeCards: HomeCard[];
  onLoginClick: () => void;
}

export function UnauthenticatedGrid({ homeCards, onLoginClick }: UnauthenticatedGridProps) {
  const { toast } = useToast();

  const handleCardClick = () => {
    toast({
      title: 'Accès restreint',
      description: 'Veuillez vous connecter pour accéder à cette section',
      variant: 'destructive',
    });
    onLoginClick();
  };

  const logoCard = homeCards.find(c => c.is_logo);
  const regularCards = homeCards.filter(c => !c.is_logo);
  const supportCardIndex = regularCards.findIndex(c => 
    c.title?.toLowerCase().includes('support') || 
    c.title?.toLowerCase().includes('demande') ||
    c.link?.includes('/mes-demandes') ||
    c.link?.includes('/support')
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
      {regularCards.map((card, index) => {
        const Icon = getIconComponent(card.icon || 'BookOpen', Icons);
        const isSupportCard = index === supportCardIndex;
        
        // Cas spécial: Support + Logo empilés
        if (isSupportCard && logoCard) {
          return (
            <div key={card.id} className="flex flex-col gap-3 min-h-[240px]">
              <div
                onClick={handleCardClick}
                className="group relative border-2 border-primary/20 border-l-4 border-l-accent bg-gradient-to-r from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 rounded-full px-4 py-2 hover:shadow-lg hover:border-primary/40 hover:scale-[1.02] transition-all duration-300 flex items-center gap-2 cursor-pointer opacity-60"
              >
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Lock className="w-8 h-8 text-destructive drop-shadow-lg" />
                </div>
                <Icon className="w-12 h-12 text-primary flex-shrink-0 opacity-50" />
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-foreground truncate">{card.title}</h2>
                  <p className="text-xs text-muted-foreground truncate">{card.description}</p>
                </div>
              </div>
              {/* Logo HelpConfort Services */}
              <div className="flex-1 flex items-center justify-center p-2">
                <img 
                  src={helpConfortServicesImg} 
                  alt="Help Confort Services" 
                  className="w-full max-w-[180px] h-auto object-contain opacity-90"
                  draggable="false"
                />
              </div>
            </div>
          );
        }
        
        return (
          <div
            key={card.id}
            onClick={handleCardClick}
            className="group relative border-2 border-primary/20 border-l-4 border-l-accent bg-gradient-to-r from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 rounded-full px-4 py-2 hover:shadow-lg hover:border-primary/40 hover:scale-[1.02] transition-all duration-300 flex items-center gap-2 cursor-pointer opacity-60"
          >
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Lock className="w-12 h-12 text-destructive drop-shadow-lg" />
            </div>
            <Icon className="w-12 h-12 text-primary flex-shrink-0 opacity-50" />
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-foreground truncate">{card.title}</h2>
              <p className="text-xs text-muted-foreground truncate">{card.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
