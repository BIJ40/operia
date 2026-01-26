/**
 * PublicGuideHeader - Header minimaliste pour le Guide Apogée public
 */

import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { OperiaLogo } from './OperiaLogo';

export function PublicGuideHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-14 items-center gap-4">
        {/* Logo OPERIA à gauche */}
        <OperiaLogo size={36} />
        
        <Link 
          to="/guide-apogee" 
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-helpconfort-blue to-helpconfort-blue/80 flex items-center justify-center shadow-md">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base leading-tight">
              <span className="text-primary">Guide Apogée</span>
            </span>
            <span className="text-[10px] text-muted-foreground leading-tight">
              HelpConfort Services
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
}
