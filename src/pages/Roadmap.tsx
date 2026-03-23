import { ArrowLeft, Rocket, Users, Building2, Sparkles, CheckCircle2, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const ROADMAP_ITEMS = [
  {
    date: '02/26',
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
    date: '06/26',
    title: 'RH Agence: Contrats & Docs',
    description: 'Génération automatique de modèles préremplis',
    icon: FileText,
    color: 'bg-teal-500',
    borderColor: 'border-teal-500',
    textColor: 'text-teal-600',
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
    <div className="container mx-auto max-w-7xl px-4 py-6 space-y-8 overflow-hidden">
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

      {/* Timeline horizontale avec alternance haut/bas */}
      <div className="relative mt-12 pt-32 pb-32">
        {/* Ligne horizontale centrale */}
        <div className="absolute top-1/2 left-4 right-4 h-1 bg-gradient-to-r from-green-500 via-blue-500 via-purple-500 via-teal-500 to-orange-500 rounded-full transform -translate-y-1/2" />

        {/* Container des items avec flex pour distribution égale */}
        <div className="relative flex justify-between px-4">
          {ROADMAP_ITEMS.map((item, index) => {
            const Icon = item.icon;
            const isTop = index % 2 === 0; // Alternance haut/bas
            
            return (
              <div 
                key={index} 
                className={cn(
                  "flex flex-col items-center relative",
                  "w-[18%]" // Largeur fixe pour chaque item
                )}
              >
                {/* Trait vertical de connexion */}
                <div 
                  className={cn(
                    "absolute w-0.5 bg-current opacity-30",
                    item.textColor,
                    isTop ? "bottom-1/2 h-20" : "top-1/2 h-20"
                  )}
                  style={{ 
                    left: '50%', 
                    transform: 'translateX(-50%)',
                  }}
                />

                {/* Point sur la ligne centrale */}
                <div 
                  className={cn(
                    "absolute left-1/2 transform -translate-x-1/2 w-10 h-10 rounded-full flex items-center justify-center shadow-lg z-10",
                    item.color,
                    "ring-4 ring-background"
                  )}
                  style={{ top: '50%', transform: 'translate(-50%, -50%)' }}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>

                {/* Card positionnée en haut ou en bas */}
                <div 
                  className={cn(
                    "absolute left-1/2 transform -translate-x-1/2 w-full",
                    isTop ? "bottom-[calc(50%+3rem)]" : "top-[calc(50%+3rem)]"
                  )}
                >
                  {/* Date badge */}
                  <div className={cn(
                    "mx-auto w-fit px-2 py-0.5 rounded-full text-xs font-bold mb-2",
                    item.color,
                    "text-white"
                  )}>
                    {item.date}
                  </div>

                  {/* Card content */}
                  <div className={cn(
                    "p-3 rounded-xl border-2 bg-card text-center",
                    item.borderColor,
                    "hover:shadow-lg transition-shadow"
                  )}>
                    <h3 className={cn("font-bold text-sm leading-tight", item.textColor)}>
                      {item.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-tight">
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Note */}
      <div className="text-center text-sm text-muted-foreground">
        <CheckCircle2 className="w-4 h-4 inline-block mr-2" />
        Les dates sont indicatives et peuvent évoluer selon les priorités
      </div>
    </div>
  );
}
