/**
 * PublicGuideHome - Page d'accueil du Guide Apogée (dans un onglet)
 * Version allégée car la sidebar est toujours visible
 */

import { BookOpen, AlertTriangle, MousePointerClick, Layers, GripVertical, Info } from 'lucide-react';

export default function PublicGuideHome() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <BookOpen className="w-10 h-10 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Guide Apogée</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Toutes les informations pour maîtriser le logiciel Apogée
        </p>
      </div>

      {/* Avertissement */}
      <div className="mb-8 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
              <span className="font-semibold">En cours de rédaction</span> — Ce manuel est mis à jour au fur et à mesure de l'évolution du logiciel.
            </p>
          </div>
        </div>
      </div>

      {/* Description du guide */}
      <div className="mb-8 bg-card border rounded-lg p-6">
        <div className="flex items-start gap-3 mb-4">
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <h2 className="font-semibold text-foreground mb-2">À propos de ce guide</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ce guide utilisateur vous accompagne dans la prise en main et l'utilisation quotidienne du logiciel Apogée. 
              Chaque section détaille les fonctionnalités, les bonnes pratiques et les astuces pour optimiser votre travail.
            </p>
          </div>
        </div>
      </div>

      {/* Comment utiliser cette interface */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
        <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          Comment utiliser cette interface
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <MousePointerClick className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">Ouvrir une catégorie</p>
              <p className="text-sm text-muted-foreground">
                Cliquez sur une catégorie dans la <span className="font-medium">sidebar à gauche</span> pour l'ouvrir dans un nouvel onglet.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">Naviguer entre les onglets</p>
              <p className="text-sm text-muted-foreground">
                Vous pouvez ouvrir <span className="font-medium">plusieurs catégories en même temps</span> et naviguer entre elles grâce aux onglets en haut de la zone de contenu.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <GripVertical className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">Réorganiser les onglets</p>
              <p className="text-sm text-muted-foreground">
                Glissez-déposez les onglets pour les <span className="font-medium">réorganiser</span> selon vos préférences. Fermez un onglet en cliquant sur la croix (×).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
