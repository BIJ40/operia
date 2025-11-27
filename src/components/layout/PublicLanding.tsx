import { Button } from '@/components/ui/button';
import { BarChart3, BookOpen, Headset, Network, LogIn } from 'lucide-react';
import { motion } from 'framer-motion';

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
          <motion.h1 
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-primary">Pilotez</span> votre agence.
            <br />
            <span className="text-primary">Maîtrisez</span> le logiciel Apogée.
          </motion.h1>
          <motion.h1 
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <span className="text-accent">Accédez</span> à toutes les ressources.
          </motion.h1>
          <motion.p 
            className="text-xl text-muted-foreground mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            La plateforme complète pour gérer votre franchise HelpConfort
          </motion.p>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.45 }}
          >
            <Button 
              onClick={onLoginClick}
              size="lg"
              className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground shadow-xl hover:shadow-2xl transition-all text-lg px-8 py-6"
            >
              <LogIn className="w-6 h-6" />
              Accéder à mon espace
            </Button>
          </motion.div>
        </div>

        {/* Features Grid with elaborate animations */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {/* Card 1: Spin from top */}
          <SpinFromTopCard
            icon={BarChart3}
            title="Pilotage d'agence"
            description="KPI, CA, actions à mener. Visualisez les performances de votre agence en temps réel."
            color="primary"
            delay={0.8}
          />
          
          {/* Card 2: Scale/Shrink into place */}
          <ScaleInCard
            icon={BookOpen}
            title="Documentation"
            description="Guides complets, FAQ, ressources. Tout pour maîtriser Apogée et vos process."
            color="accent"
            delay={2.5}
          />
          
          {/* Card 3: Puzzle pieces assembly */}
          <PuzzleCard
            icon={Headset}
            title="Support"
            description="Tickets, demandes, assistance. Une équipe dédiée pour vous accompagner."
            color="primary"
            delay={4.0}
          />
          
          {/* Card 4: Fireworks/Burst effect */}
          <FireworksCard
            icon={Network}
            title="Réseau"
            description="Pilotage franchiseur, statistiques réseau, gestion globale."
            color="accent"
            delay={5.5}
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

interface CardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  color: 'primary' | 'accent';
  delay?: number;
}

const colorClasses = {
  primary: 'bg-primary/10 text-primary border-primary/20',
  accent: 'bg-accent/10 text-accent border-accent/20',
};

// Card 1: Spins while falling from the top
function SpinFromTopCard({ icon: Icon, title, description, color, delay = 0 }: CardProps) {
  return (
    <motion.div
      className="group bg-card border rounded-2xl p-6 hover:shadow-lg hover:border-primary/30 transition-all duration-300"
      initial={{ opacity: 0, y: -300, rotate: -1080 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ 
        duration: 1.8,
        delay,
        type: "spring",
        stiffness: 40,
        damping: 10
      }}
      whileHover={{ scale: 1.02, y: -4 }}
    >
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${colorClasses[color]}`}>
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </motion.div>
  );
}

// Card 2: Starts huge and shrinks to its final size
function ScaleInCard({ icon: Icon, title, description, color, delay = 0 }: CardProps) {
  return (
    <motion.div
      className="group bg-card border rounded-2xl p-6 hover:shadow-lg hover:border-primary/30 transition-all duration-300"
      initial={{ opacity: 0, scale: 5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ 
        duration: 1.4,
        delay,
        type: "spring",
        stiffness: 50,
        damping: 12
      }}
      whileHover={{ scale: 1.02, y: -4 }}
    >
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${colorClasses[color]}`}>
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </motion.div>
  );
}

// Card 3: Assembles from 4 puzzle pieces
function PuzzleCard({ icon: Icon, title, description, color, delay = 0 }: CardProps) {
  const pieces = [
    { x: -200, y: -200, rotate: -90 }, // Top-left
    { x: 200, y: -200, rotate: 90 },   // Top-right
    { x: -200, y: 200, rotate: 90 },   // Bottom-left
    { x: 200, y: 200, rotate: -90 },   // Bottom-right
  ];

  return (
    <motion.div
      className="group bg-card border rounded-2xl p-6 hover:shadow-lg hover:border-primary/30 transition-all duration-300 relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.3 }}
      whileHover={{ scale: 1.02, y: -4 }}
    >
      {/* Animated puzzle overlay pieces */}
      {pieces.map((piece, index) => (
        <motion.div
          key={index}
          className="absolute inset-0 bg-card rounded-2xl"
          style={{ 
            clipPath: index === 0 ? 'polygon(0 0, 50% 0, 50% 50%, 0 50%)' :
                      index === 1 ? 'polygon(50% 0, 100% 0, 100% 50%, 50% 50%)' :
                      index === 2 ? 'polygon(0 50%, 50% 50%, 50% 100%, 0 100%)' :
                                    'polygon(50% 50%, 100% 50%, 100% 100%, 50% 100%)'
          }}
          initial={{ 
            x: piece.x, 
            y: piece.y, 
            rotate: piece.rotate,
            opacity: 1 
          }}
          animate={{ 
            x: 0, 
            y: 0, 
            rotate: 0,
            opacity: 0
          }}
          transition={{ 
            duration: 1.2,
            delay: delay + (index * 0.2),
            type: "spring",
            stiffness: 50,
            damping: 10
          }}
        />
      ))}
      
      {/* Card content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 1.0, duration: 0.5 }}
      >
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${colorClasses[color]}`}>
          <Icon className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      </motion.div>
    </motion.div>
  );
}

// Card 4: Appears with a fireworks/burst effect
function FireworksCard({ icon: Icon, title, description, color, delay = 0 }: CardProps) {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    angle: (i * 18) * (Math.PI / 180),
    distance: 120 + Math.random() * 60,
  }));

  return (
    <motion.div
      className="group bg-card border rounded-2xl p-6 hover:shadow-lg hover:border-primary/30 transition-all duration-300 relative overflow-hidden"
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ 
        delay,
        duration: 0.8,
        type: "spring",
        stiffness: 100,
        damping: 15
      }}
      whileHover={{ scale: 1.02, y: -4 }}
    >
      {/* Fireworks particles */}
      {particles.map((particle, index) => (
        <motion.div
          key={index}
          className="absolute w-3 h-3 rounded-full"
          style={{
            left: '50%',
            top: '50%',
            backgroundColor: index % 2 === 0 ? 'hsl(var(--primary))' : 'hsl(var(--accent))',
          }}
          initial={{ 
            x: 0, 
            y: 0, 
            scale: 0,
            opacity: 1 
          }}
          animate={{ 
            x: Math.cos(particle.angle) * particle.distance,
            y: Math.sin(particle.angle) * particle.distance,
            scale: [0, 2, 0],
            opacity: [1, 1, 0]
          }}
          transition={{ 
            duration: 1.2,
            delay: delay + 0.2,
            ease: "easeOut"
          }}
        />
      ))}
      
      {/* Card content */}
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${colorClasses[color]}`}>
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </motion.div>
  );
}
