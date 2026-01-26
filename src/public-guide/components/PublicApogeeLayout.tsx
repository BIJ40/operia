/**
 * PublicApogeeLayout - Layout minimaliste pour le Guide Apogée public
 * Sans header applicatif, sans bouton retour vers l'application interne
 */

import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

interface PublicApogeeLayoutProps {
  children: ReactNode;
}

export function PublicApogeeLayout({ children }: PublicApogeeLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex flex-col">
      {/* Header minimaliste */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-16 items-center">
          <Link 
            to="/guide-apogee" 
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-helpconfort-blue to-helpconfort-blue/80 flex items-center justify-center shadow-lg">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-tight">
                <span className="text-primary">Guide Apogée</span>
              </span>
              <span className="text-xs text-muted-foreground leading-tight">
                HelpConfort Services
              </span>
            </div>
          </Link>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="flex-1 container py-6">
        {children}
      </main>

      {/* Footer simple */}
      <footer className="border-t bg-muted/30 py-4 mt-auto">
        <div className="container text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} HelpConfort Services - Guide Apogée</p>
        </div>
      </footer>
    </div>
  );
}
