import { Button } from '@/components/ui/button';
import { BarChart3, BookOpen, Headset, Network, LogIn } from 'lucide-react';
import logoHelpconfort from '@/assets/logo_helpogee.png';

interface PublicLandingProps {
  onLoginClick: () => void;
}

export function PublicLanding({ onLoginClick }: PublicLandingProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header bandeau */}
      <header className="w-full bg-gradient-to-r from-primary to-primary-dark">
        <div className="container mx-auto px-6 py-3">
          <p className="text-center text-primary-foreground text-lg md:text-xl font-medium tracking-wide">
            urgence <span className="mx-2 opacity-60">|</span> dépannage <span className="mx-2 opacity-60">|</span> amélioration de l'habitat
          </p>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-16 md:py-24">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <h1 
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight animate-fade-in opacity-0"
            style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}
          >
            <span className="text-primary">Pilotez</span> votre agence.
            <br />
            <span className="text-primary">Maîtrisez</span> le logiciel Apogée.
          </h1>
          <h1 
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight animate-fade-in opacity-0"
            style={{ animationDelay: '150ms', animationFillMode: 'forwards' }}
          >
            <span className="text-accent">Accédez</span> à toutes les ressources.
          </h1>
          <p 
            className="text-xl text-muted-foreground mb-8 animate-fade-in opacity-0"
            style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}
          >
            La plateforme complète pour gérer votre franchise HelpConfort
          </p>
          <Button 
            onClick={onLoginClick}
            size="lg"
            className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground shadow-xl hover:shadow-2xl transition-all text-lg px-8 py-6"
          >
            <LogIn className="w-6 h-6" />
            Accéder à mon espace
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <FeatureCard
            icon={BarChart3}
            title="Pilotage d'agence"
            description="KPI, CA, actions à mener. Visualisez les performances de votre agence en temps réel."
            color="primary"
            delay={0}
          />
          <FeatureCard
            icon={BookOpen}
            title="Documentation"
            description="Guides complets, FAQ, ressources. Tout pour maîtriser Apogée et vos process."
            color="accent"
            delay={100}
          />
          <FeatureCard
            icon={Headset}
            title="Support"
            description="Tickets, demandes, assistance. Une équipe dédiée pour vous accompagner."
            color="primary"
            delay={200}
          />
          <FeatureCard
            icon={Network}
            title="Réseau"
            description="Pilotage franchiseur, statistiques réseau, gestion globale."
            color="accent"
            delay={300}
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-8 mt-auto">
        <div className="container mx-auto px-6 text-center text-muted-foreground">
          <p>© {new Date().getFullYear()} HelpConfort Services. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  color: 'primary' | 'accent';
  delay?: number;
}

function FeatureCard({ icon: Icon, title, description, color, delay = 0 }: FeatureCardProps) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    accent: 'bg-accent/10 text-accent border-accent/20',
  };

  return (
    <div 
      className="group bg-card border rounded-2xl p-6 hover:shadow-lg hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 animate-fade-in opacity-0"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${colorClasses[color]}`}>
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </div>
  );
}
