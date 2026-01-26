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
      {/* Header avec avertissement */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container py-3">
          <div className="flex items-start gap-4">
            <Link 
              to="/guide-apogee" 
              className="flex-shrink-0 hover:opacity-80 transition-opacity"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-helpconfort-blue to-helpconfort-blue/80 flex items-center justify-center shadow-lg">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
            </Link>
            <div className="flex flex-col gap-1 min-w-0">
              <Link to="/guide-apogee" className="hover:opacity-80 transition-opacity">
                <span className="font-bold text-lg text-primary">Guide Apogée</span>
                <span className="text-xs text-muted-foreground ml-2">HelpConfort Services</span>
              </Link>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-medium text-amber-600 dark:text-amber-400">Version préliminaire</span> — Ce manuel d'utilisation d'Apogée est en cours de réalisation et mis à jour au fur et à mesure de l'évolution du logiciel. Si une information est manquante, erronée ou obsolète, merci de <span className="font-medium">prévenir le franchiseur</span>. Prochainement, vous aurez la possibilité de créer un ticket, poser des questions et proposer des améliorations via un support interne.
              </p>
            </div>
          </div>
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
