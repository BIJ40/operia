import { Briefcase, TrendingUp, Users, Target, FileText, BarChart3, Presentation } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { CollapsibleSection } from '@/components/dashboard/CollapsibleSection';
import { ROUTES } from '@/config/routes';
import type { LucideIcon } from 'lucide-react';

interface CommercialModule {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  badge?: string;
}

const commercialModules: CommercialModule[] = [
  {
    id: 'support-pptx',
    title: 'Support Commercial PPTX',
    description: 'Générer un PowerPoint commercial personnalisé par agence',
    icon: Presentation,
    href: ROUTES.agency.commercialPptx,
  },
  {
    id: 'pipeline',
    title: 'Pipeline Commercial',
    description: 'Suivi des opportunités et devis en cours',
    icon: TrendingUp,
    href: '#',
    badge: 'Bientôt',
  },
  {
    id: 'prospects',
    title: 'Gestion Prospects',
    description: 'Base de données prospects et clients potentiels',
    icon: Users,
    href: '#',
    badge: 'Bientôt',
  },
  {
    id: 'objectifs',
    title: 'Objectifs Commerciaux',
    description: 'Suivi des objectifs et performances',
    icon: Target,
    href: '#',
    badge: 'Bientôt',
  },
  {
    id: 'devis',
    title: 'Mes Devis',
    description: 'Historique et suivi des devis émis',
    icon: FileText,
    href: '#',
    badge: 'Bientôt',
  },
  {
    id: 'stats',
    title: 'Statistiques Commerciales',
    description: 'Analyse des performances commerciales',
    icon: BarChart3,
    href: '#',
    badge: 'Bientôt',
  },
];

export default function CommercialPage() {
  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <CollapsibleSection
        id="commercial_modules"
        title="Outils Commerciaux"
        icon={Briefcase}
        colorClass="text-helpconfort-orange"
      >
        {commercialModules.map(module => (
          <CommercialTileCard key={module.id} module={module} />
        ))}
      </CollapsibleSection>
    </div>
  );
}

interface CommercialTileCardProps {
  module: CommercialModule;
}

function CommercialTileCard({ module }: CommercialTileCardProps) {
  const Icon = module.icon;
  const isDisabled = module.badge === 'Bientôt';

  const content = (
    <div className={`
      group relative rounded-xl border border-helpconfort-orange/15 p-4
      bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-helpconfort-orange/10 via-background to-background
      shadow-sm transition-all duration-300 border-l-4 border-l-helpconfort-orange
      min-w-[280px] md:min-w-0 snap-start
      ${isDisabled 
        ? 'opacity-50 cursor-not-allowed' 
        : 'cursor-pointer hover:from-helpconfort-orange/20 hover:shadow-lg hover:-translate-y-0.5'
      }
    `}>
      {module.badge && (
        <span className="absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full z-10 bg-helpconfort-orange text-white text-[10px]">
          {module.badge}
        </span>
      )}
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full border-2 border-helpconfort-orange/30 flex-shrink-0 flex items-center justify-center bg-helpconfort-orange/10
          ${!isDisabled && 'group-hover:border-helpconfort-orange'} transition-all`}>
          <Icon className="w-5 h-5 text-helpconfort-orange" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-foreground truncate">{module.title}</p>
          <p className="text-xs text-muted-foreground truncate">{module.description}</p>
        </div>
        <ArrowRight className={`w-4 h-4 flex-shrink-0 text-muted-foreground ${!isDisabled && 'group-hover:text-helpconfort-orange group-hover:translate-x-0.5'} transition-all`} aria-hidden="true" />
      </div>
    </div>
  );

  if (isDisabled) {
    return content;
  }

  return <Link to={module.href}>{content}</Link>;
}
