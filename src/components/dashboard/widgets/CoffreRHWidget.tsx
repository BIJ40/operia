/**
 * CoffreRHWidget - Widget avec grande icône de coffre-fort
 */

import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function CoffreRHWidget() {
  const navigate = useNavigate();

  return (
    <Button
      variant="ghost"
      className="w-full h-full flex flex-col items-center justify-center hover:bg-helpconfort-blue/5 transition-colors group"
      onClick={() => navigate('/mon-coffre-rh')}
    >
      {/* Grande icône de coffre-fort avec volant */}
      <div className="relative">
        {/* Corps du coffre */}
        <div className="w-14 h-12 bg-gradient-to-br from-helpconfort-blue/20 to-helpconfort-blue/10 rounded-lg border-2 border-helpconfort-blue/30 flex items-center justify-center group-hover:border-helpconfort-blue/50 transition-colors">
          {/* Volant du coffre */}
          <div className="relative w-8 h-8">
            <svg 
              viewBox="0 0 100 100" 
              className="w-full h-full text-helpconfort-blue drop-shadow-sm"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
            >
              <circle cx="50" cy="50" r="30" className="fill-helpconfort-blue/10" />
              <circle cx="50" cy="50" r="30" />
              <line x1="50" y1="15" x2="50" y2="35" strokeLinecap="round" />
              <line x1="50" y1="65" x2="50" y2="85" strokeLinecap="round" />
              <line x1="15" y1="50" x2="35" y2="50" strokeLinecap="round" />
              <line x1="65" y1="50" x2="85" y2="50" strokeLinecap="round" />
              <circle cx="50" cy="50" r="8" className="fill-helpconfort-blue" />
            </svg>
          </div>
        </div>
        <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-5 bg-helpconfort-blue/40 rounded-r group-hover:bg-helpconfort-blue/60 transition-colors" />
      </div>
    </Button>
  );
}
