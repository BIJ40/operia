/**
 * CoffreRHWidget - Widget avec cadran de coffre-fort
 */

import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function CoffreRHWidget() {
  const navigate = useNavigate();

  return (
    <Button
      variant="ghost"
      className="w-full h-full flex items-center justify-center p-2 hover:bg-helpconfort-blue/5 transition-colors group"
      onClick={() => navigate('/mon-coffre-rh')}
    >
      {/* Cadran de coffre-fort */}
      <div className="relative w-20 h-20">
        <svg 
          viewBox="0 0 100 100" 
          className="w-full h-full"
          fill="none"
        >
          {/* Fond du cadran */}
          <circle 
            cx="50" cy="50" r="46" 
            className="fill-helpconfort-blue/10 stroke-helpconfort-blue/30 group-hover:stroke-helpconfort-blue/50 transition-colors" 
            strokeWidth="3"
          />
          
          {/* Cercle intérieur */}
          <circle 
            cx="50" cy="50" r="35" 
            className="fill-background stroke-helpconfort-blue/40 group-hover:stroke-helpconfort-blue/60 transition-colors" 
            strokeWidth="2"
          />
          
          {/* Graduations principales (12 positions) */}
          {[...Array(12)].map((_, i) => {
            const angle = (i * 30 - 90) * (Math.PI / 180);
            const x1 = 50 + 40 * Math.cos(angle);
            const y1 = 50 + 40 * Math.sin(angle);
            const x2 = 50 + 46 * Math.cos(angle);
            const y2 = 50 + 46 * Math.sin(angle);
            return (
              <line 
                key={i}
                x1={x1} y1={y1} x2={x2} y2={y2}
                className="stroke-helpconfort-blue"
                strokeWidth="2"
                strokeLinecap="round"
              />
            );
          })}
          
          {/* Chiffres clés */}
          <text x="50" y="18" textAnchor="middle" className="fill-helpconfort-blue text-[8px] font-bold">0</text>
          <text x="82" y="53" textAnchor="middle" className="fill-helpconfort-blue text-[8px] font-bold">25</text>
          <text x="50" y="88" textAnchor="middle" className="fill-helpconfort-blue text-[8px] font-bold">50</text>
          <text x="18" y="53" textAnchor="middle" className="fill-helpconfort-blue text-[8px] font-bold">75</text>
          
          {/* Aiguille */}
          <line 
            x1="50" y1="50" x2="50" y2="22"
            className="stroke-helpconfort-orange group-hover:stroke-helpconfort-orange/80 transition-colors"
            strokeWidth="3"
            strokeLinecap="round"
          />
          
          {/* Centre du cadran */}
          <circle 
            cx="50" cy="50" r="6" 
            className="fill-helpconfort-blue group-hover:fill-helpconfort-blue/80 transition-colors"
          />
          <circle 
            cx="50" cy="50" r="3" 
            className="fill-background"
          />
        </svg>
      </div>
    </Button>
  );
}
