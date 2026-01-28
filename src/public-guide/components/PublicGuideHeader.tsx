/**
 * PublicGuideHeader - Header minimaliste pour le Guide Apogée public
 * Version Warm Pastel
 */

import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

export function PublicGuideHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-14 items-center">
        <Link 
          to="/guide-apogee" 
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-warm-blue to-warm-teal flex items-center justify-center shadow-warm">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base leading-tight text-foreground">
              Guide Apogée
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
