import { ArrowLeft, Rocket, Users, Building2, Sparkles, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const ROADMAP_ITEMS = [
  {
    date: '01/26',
    title: 'Stabilisation & V1',
    description: 'Sortie de la version 1.0 stable',
    icon: Rocket,
    color: 'bg-green-500',
    borderColor: 'border-green-500',
    textColor: 'text-green-600',
  },
  {
    date: '03/26',
    title: 'Gestion RH Utilisateurs',
    description: 'Module RH complet pour la gestion des collaborateurs',
    icon: Users,
    color: 'bg-blue-500',
    borderColor: 'border-blue-500',
    textColor: 'text-blue-600',
  },
  {
    date: '04/26',
    title: 'Espace Apporteurs',
    description: 'Portail dédié aux apporteurs d\'affaires',
    icon: Building2,
    color: 'bg-purple-500',
    borderColor: 'border-purple-500',
    textColor: 'text-purple-600',
  },
  {
    date: '12/26',
    title: 'Smart Suggestion Engine',
    description: 'Devis intelligents avec suggestions automatiques',
    icon: Sparkles,
    color: 'bg-orange-500',
    borderColor: 'border-orange-500',
    textColor: 'text-orange-600',
  },
];

export default function Roadmap() {
  return (
    <div className="container mx-auto px-4 py-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link 
          to="/changelog" 
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour au changelog
        </Link>
      </div>

      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Roadmap 2026</h1>
        <p className="text-muted-foreground">Les prochaines évolutions de la plateforme HelpConfort</p>
      </div>

      {/* Timeline horizontale */}
      <div className="relative mt-16 pb-8">
        {/* Ligne horizontale */}
        <div className="absolute top-8 left-0 right-0 h-1 bg-gradient-to-r from-green-500 via-blue-500 via-purple-500 to-orange-500 rounded-full" />

        {/* Items */}
        <div className="relative grid grid-cols-1 md:grid-cols-4 gap-6">
          {ROADMAP_ITEMS.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="flex flex-col items-center">
                {/* Point sur la ligne */}
                <div className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center shadow-lg z-10",
                  item.color,
                  "ring-4 ring-background"
                )}>
                  <Icon className="w-8 h-8 text-white" />
                </div>

                {/* Date */}
                <div className={cn(
                  "mt-4 px-3 py-1 rounded-full text-sm font-bold",
                  item.color,
                  "text-white"
                )}>
                  {item.date}
                </div>

                {/* Card */}
                <div className={cn(
                  "mt-4 p-4 rounded-xl border-2 bg-card w-full text-center",
                  item.borderColor,
                  "hover:shadow-lg transition-shadow"
                )}>
                  <h3 className={cn("font-bold text-lg", item.textColor)}>
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Note */}
      <div className="text-center text-sm text-muted-foreground mt-8">
        <CheckCircle2 className="w-4 h-4 inline-block mr-2" />
        Les dates sont indicatives et peuvent évoluer selon les priorités
      </div>
    </div>
  );
}
