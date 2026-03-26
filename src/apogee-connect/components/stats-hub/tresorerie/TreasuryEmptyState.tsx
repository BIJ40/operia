/**
 * TreasuryEmptyState — Premium empty state quand aucune banque n'est connectée
 */

import { Landmark, TrendingUp, FileCheck, Bell, Eye, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  onConnect: () => void;
}

const FEATURES = [
  { icon: <Eye className="h-4 w-4" />, title: 'Suivi trésorerie temps réel', desc: 'Visualisez vos soldes et mouvements en un coup d\'œil' },
  { icon: <FileCheck className="h-4 w-4" />, title: 'Pointage & rapprochement', desc: 'Rapprochez automatiquement vos transactions avec vos factures' },
  { icon: <TrendingUp className="h-4 w-4" />, title: 'Projection de cash', desc: 'Anticipez votre trésorerie à 30, 60, 90 jours' },
  { icon: <Bell className="h-4 w-4" />, title: 'Alertes trésorerie', desc: 'Soyez alerté en cas de solde bas ou mouvement anormal' },
];

export function TreasuryEmptyState({ onConnect }: Props) {
  return (
    <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-muted/20 p-8 shadow-sm">
      <div className="max-w-lg mx-auto text-center space-y-6">
        {/* Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center">
          <Landmark className="h-8 w-8 text-emerald-600" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h2 className="text-xl font-bold">Cockpit Trésorerie</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Connectez vos comptes bancaires pour piloter votre trésorerie en temps réel. 
            Soldes consolidés, transactions, rapprochement automatique et alertes intelligentes.
          </p>
        </div>

        {/* CTA */}
        <Button size="lg" className="gap-2 px-8" onClick={onConnect}>
          <Landmark className="h-4 w-4" />
          Connecter ma banque
          <ArrowRight className="h-4 w-4" />
        </Button>

        {/* Features grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
          {FEATURES.map((feat, i) => (
            <div
              key={i}
              className="flex items-start gap-3 text-left rounded-lg border border-border/40 bg-background/60 p-3"
            >
              <div className="shrink-0 mt-0.5 text-muted-foreground">{feat.icon}</div>
              <div>
                <p className="text-sm font-medium">{feat.title}</p>
                <p className="text-xs text-muted-foreground">{feat.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground/60 pt-2">
          <span>🔒 Connexion sécurisée</span>
          <span>·</span>
          <span>📖 Lecture seule</span>
          <span>·</span>
          <span>🏦 Compatible toutes banques</span>
        </div>
      </div>
    </div>
  );
}
