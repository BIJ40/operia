import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { 
  BookOpen, FileText, FolderOpen, BarChart3, ListTodo, Tv,
  MessageSquare, Network, ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface DashboardCard {
  title: string;
  description: string;
  icon: React.ElementType;
  url: string;
  color: 'primary' | 'accent';
  scope?: string;
}

export default function Landing() {
  const { canViewScope, isFranchiseur, isAdmin } = useAuth();

  const helpAcademyCards: DashboardCard[] = [
    { title: 'Guide Apogée', description: 'Guide complet pour maîtriser le logiciel Apogée', icon: BookOpen, url: '/apogee', color: 'primary', scope: 'apogee' },
    { title: 'Guide Apporteurs', description: 'Ressources pour les apporteurs d\'affaires', icon: FileText, url: '/apporteurs', color: 'primary', scope: 'apporteurs' },
    { title: 'Base Documentaire', description: 'Documents et ressources HelpConfort', icon: FolderOpen, url: '/helpconfort', color: 'primary', scope: 'helpconfort' },
  ];

  const pilotageCards: DashboardCard[] = [
    { title: 'Mes Indicateurs', description: 'Tableau de bord et KPI de votre agence', icon: BarChart3, url: '/mes-indicateurs', color: 'accent', scope: 'mes_indicateurs' },
    { title: 'Actions à Mener', description: 'Suivi des actions et tâches en cours', icon: ListTodo, url: '/actions-a-mener', color: 'accent', scope: 'actions_a_mener' },
    { title: 'Diffusion', description: 'Mode affichage TV agence', icon: Tv, url: '/diffusion', color: 'accent', scope: 'diffusion' },
  ];

  const supportCards: DashboardCard[] = [
    { title: 'Mes Demandes', description: 'Créer et suivre vos demandes de support', icon: MessageSquare, url: '/mes-demandes', color: 'primary', scope: 'mes_demandes' },
  ];

  const franchiseurCard: DashboardCard = { 
    title: 'Réseau Franchiseur', 
    description: 'Pilotage multi-agences et statistiques réseau', 
    icon: Network, 
    url: '/tete-de-reseau', 
    color: 'accent',
    scope: 'franchiseur_dashboard'
  };

  const filterCards = (cards: DashboardCard[]) => {
    return cards.filter(card => !card.scope || canViewScope(card.scope));
  };

  const filteredHelpCards = filterCards(helpAcademyCards);
  const filteredPilotageCards = filterCards(pilotageCards);
  const filteredSupportCards = filterCards(supportCards);
  const showFranchiseur = (isFranchiseur || isAdmin) && canViewScope('franchiseur_dashboard');

  return (
    <div className="container mx-auto px-6 py-8 space-y-10">
      {/* Welcome section */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Bienvenue sur <span className="text-primary">HC Services</span>
        </h1>
        <p className="text-muted-foreground">
          Votre espace centralisé pour piloter votre agence HelpConfort
        </p>
      </div>

      {/* HELP Academy Section */}
      {filteredHelpCards.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Help<span className="text-helpconfort-orange animate-pulse inline-block -ml-[1px]">!</span> Academy
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {filteredHelpCards.map((card) => (
              <DashboardCardComponent key={card.url} card={card} />
            ))}
          </div>
        </section>
      )}

      {/* Pilotage Section */}
      {filteredPilotageCards.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-accent" />
            Pilotage Agence
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {filteredPilotageCards.map((card) => (
              <DashboardCardComponent key={card.url} card={card} />
            ))}
          </div>
        </section>
      )}

      {/* Support Section */}
      {filteredSupportCards.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Support
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {filteredSupportCards.map((card) => (
              <DashboardCardComponent key={card.url} card={card} />
            ))}
          </div>
        </section>
      )}

      {/* Franchiseur Section */}
      {showFranchiseur && (
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Network className="w-5 h-5 text-accent" />
            Réseau
          </h2>
          <div className="max-w-md">
            <DashboardCardComponent card={franchiseurCard} />
          </div>
        </section>
      )}
    </div>
  );
}

function DashboardCardComponent({ card }: { card: DashboardCard }) {
  const Icon = card.icon;
  const colorClasses = {
    primary: 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground',
    accent: 'bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground',
  };

  return (
    <Link to={card.url}>
      <Card className="group h-full hover:shadow-lg hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${colorClasses[card.color]}`}>
              <Icon className="w-6 h-6" />
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
        </CardHeader>
        <CardContent>
          <CardTitle className="text-lg mb-1">{card.title}</CardTitle>
          <CardDescription className="text-sm">{card.description}</CardDescription>
        </CardContent>
      </Card>
    </Link>
  );
}
