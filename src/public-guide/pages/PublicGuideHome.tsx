/**
 * PublicGuideHome - Page d'accueil du Guide Apogée (dans un onglet)
 * Version Warm Pastel
 */

import { BookOpen, AlertTriangle, MousePointerClick, Layers, GripVertical, Info, Sparkles } from 'lucide-react';
import { WarmCard } from '@/components/ui/warm-card';

export default function PublicGuideHome() {
  return (
    <div className="p-6 max-w-3xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-warm-blue/20 to-warm-teal/10 mb-4 shadow-warm">
          <BookOpen className="w-8 h-8 text-warm-blue" />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Guide Apogée</h1>
        <p className="text-muted-foreground text-lg">
          Toutes les informations pour maîtriser le logiciel Apogée
        </p>
      </div>

      {/* Avertissement */}
      <WarmCard 
        variant="gradient" 
        accentColor="orange" 
        className="mb-6"
        icon={AlertTriangle}
        title="Version simplifiée"
        description="Ce guide est actuellement en version allégée et sera enrichi progressivement."
      >
        <div className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            La <span className="font-medium text-foreground">version complète</span> sera livrée prochainement avec :
          </p>
          <ul className="text-muted-foreground space-y-1.5 ml-1">
            <li className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-warm-orange" />
              Un support d'utilisation détaillé
            </li>
            <li className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-warm-orange" />
              Un suivi des tickets ouverts
            </li>
            <li className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-warm-orange" />
              Une FAQ interactive
            </li>
          </ul>
        </div>
      </WarmCard>

      {/* Description du guide */}
      <WarmCard 
        variant="default" 
        className="mb-6"
        icon={Info}
        title="À propos de ce guide"
        accentColor="blue"
      >
        <p className="text-sm text-muted-foreground leading-relaxed">
          Ce guide utilisateur vous accompagne dans la prise en main et l'utilisation quotidienne du logiciel Apogée. 
          Chaque section détaille les fonctionnalités, les bonnes pratiques et les astuces pour optimiser votre travail.
        </p>
      </WarmCard>

      {/* Comment utiliser cette interface */}
      <WarmCard 
        variant="gradient" 
        accentColor="teal"
        icon={Layers}
        title="Comment utiliser cette interface"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-warm-teal/15 flex items-center justify-center shrink-0">
              <MousePointerClick className="w-5 h-5 text-warm-teal" />
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">Ouvrir une catégorie</p>
              <p className="text-sm text-muted-foreground">
                Cliquez sur une catégorie dans la <span className="font-medium">sidebar à gauche</span> pour l'ouvrir dans un nouvel onglet.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-warm-teal/15 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5 text-warm-teal" />
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">Naviguer entre les onglets</p>
              <p className="text-sm text-muted-foreground">
                Vous pouvez ouvrir <span className="font-medium">plusieurs catégories en même temps</span> et naviguer entre elles grâce aux onglets en haut de la zone de contenu.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-warm-teal/15 flex items-center justify-center shrink-0">
              <GripVertical className="w-5 h-5 text-warm-teal" />
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">Réorganiser les onglets</p>
              <p className="text-sm text-muted-foreground">
                Glissez-déposez les onglets pour les <span className="font-medium">réorganiser</span> selon vos préférences. Fermez un onglet en cliquant sur la croix (×).
              </p>
            </div>
          </div>
        </div>
      </WarmCard>
    </div>
  );
}
