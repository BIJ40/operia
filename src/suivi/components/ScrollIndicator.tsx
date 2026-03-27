import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export const ScrollIndicator: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY <= 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-bounce">
      <div className="flex flex-col items-center gap-1 text-primary/70">
        <span className="text-xs font-medium">Défiler</span>
        <div className="w-8 h-8 rounded-full border-2 border-primary/30 bg-white/80 dark:bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-lg">
          <ChevronDown className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};
