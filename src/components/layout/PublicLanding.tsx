import { Button } from '@/components/ui/button';
import { BarChart3, BookOpen, Headset, Network, LogIn, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface PublicLandingProps {
  onLoginClick: () => void;
}

export function PublicLanding({ onLoginClick }: PublicLandingProps) {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header bandeau */}
      <header className="w-full bg-gradient-to-r from-primary to-primary-dark">
        <div className="container mx-auto px-4 sm:px-6 py-2 sm:py-3">
          <p className="text-center text-primary-foreground text-sm sm:text-lg md:text-xl font-medium tracking-wide">
            <span className="hidden sm:inline">urgence <span className="mx-2 opacity-60">|</span> dépannage <span className="mx-2 opacity-60">|</span> amélioration de l'habitat</span>
            <span className="sm:hidden">urgence • dépannage • habitat</span>
          </p>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-16 md:py-24">
        <div className="text-center max-w-5xl mx-auto mb-16">
          {/* Title 1: Paint effect - letters appear like being painted */}
          <PaintedTitle 
            text="Pilotez"
            suffix={<> votre agence <span className="text-primary">Help</span><span className="text-accent">!</span> <span className="text-primary">Confort</span>.</>}
            delay={0.2}
          />
          
          {/* Title 2: Repair effect - word appears broken then repairs */}
          <RepairedTitle 
            prefix="Maîtrisez"
            brokenWord="le logiciel"
            suffix=" Apogée."
            delay={1.6}
          />
          
          {/* Title 3: Replacement effect - words swap/replace */}
          <ReplacementTitle 
            prefix="Accédez"
            words={["aux outils", "aux guides", "à toutes les ressources"]}
            delay={3.5}
          />

          <motion.p 
            className="text-xl text-muted-foreground mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.8 }}
          >
            La plateforme complète pour gérer votre franchise HelpConfort
          </motion.p>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 2.2 }}
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center"
          >
            <Button 
              onClick={onLoginClick}
              size="lg"
              className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground shadow-xl hover:shadow-2xl transition-all text-base sm:text-lg px-6 py-4 sm:px-8 sm:py-6"
            >
              <LogIn className="w-5 h-5 sm:w-6 sm:h-6" />
              Accéder à mon espace
            </Button>
            <Button 
              onClick={() => navigate('/apporteur')}
              size="lg"
              variant="outline"
              className="gap-2 border-primary/30 hover:bg-primary/5 hover:border-primary/50 transition-all text-base sm:text-lg px-6 py-4 sm:px-8 sm:py-6"
            >
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              Accès Apporteur
            </Button>
          </motion.div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <FeatureCard
            icon={BarChart3}
            title="Pilotage d'agence"
            description="KPI, CA, actions à mener. Visualisez les performances de votre agence en temps réel."
            color="primary"
          />
          
          <FeatureCard
            icon={BookOpen}
            title="Documentation"
            description="Guides complets, FAQ, ressources. Tout pour maîtriser Apogée et vos process."
            color="accent"
          />
          
          <FeatureCard
            icon={Headset}
            title="Support"
            description="Tickets, demandes, assistance. Une équipe dédiée pour vous accompagner."
            color="primary"
          />
          
          <FeatureCard
            icon={Network}
            title="Réseau"
            description="Pilotage franchiseur, statistiques réseau, gestion globale."
            color="accent"
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

// ========== TITLE ANIMATIONS ==========

function PaintedTitle({ text, suffix, delay }: { text: string; suffix: React.ReactNode; delay: number }) {
  const letters = text.split('');
  
  return (
    <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-black text-foreground mb-6 leading-tight">
      <span className="inline-flex">
        {letters.map((letter, index) => (
          <motion.span
            key={index}
            className="text-primary inline-block"
            initial={{ 
              opacity: 0, 
              y: -50,
              rotateX: -90,
              filter: "blur(10px)"
            }}
            animate={{ 
              opacity: 1,
              y: 0,
              rotateX: 0,
              filter: "blur(0px)"
            }}
            transition={{ 
              duration: 0.6,
              delay: delay + index * 0.12,
              ease: "easeOut"
            }}
            style={{ 
              transformOrigin: "bottom",
              textShadow: "2px 2px 4px rgba(0,0,0,0.1)"
            }}
          >
            {letter}
          </motion.span>
        ))}
      </span>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ 
          duration: 0.5,
          delay: delay + letters.length * 0.12
        }}
      >
        {suffix}
      </motion.span>
    </h1>
  );
}

function RepairedTitle({ prefix, brokenWord, suffix, delay }: { 
  prefix: string; 
  brokenWord: string; 
  suffix: string; 
  delay: number;
}) {
  const [repairPhase, setRepairPhase] = useState(0);

  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];
    
    timeouts.push(setTimeout(() => setRepairPhase(1), delay * 1000));
    timeouts.push(setTimeout(() => setRepairPhase(2), delay * 1000 + 800));
    timeouts.push(setTimeout(() => setRepairPhase(3), delay * 1000 + 1600));
    
    return () => timeouts.forEach(clearTimeout);
  }, [delay]);

  const getBrokenText = () => {
    if (repairPhase === 0) return "";
    if (repairPhase === 1) {
      return brokenWord.split('').map((char, i) => 
        i % 2 === 0 ? char : String.fromCharCode(char.charCodeAt(0) + Math.floor(Math.random() * 10))
      ).join('');
    }
    if (repairPhase === 2) {
      return brokenWord.split('').map((char, i) => 
        i < brokenWord.length / 2 ? char : String.fromCharCode(char.charCodeAt(0) + Math.floor(Math.random() * 3))
      ).join('');
    }
    return brokenWord;
  };

  return (
    <h1 className="text-xl sm:text-3xl md:text-5xl lg:text-6xl font-black text-foreground mb-4 sm:mb-6 leading-tight sm:whitespace-nowrap">
      <motion.span
        className="text-primary"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: repairPhase >= 1 ? 1 : 0, x: repairPhase >= 1 ? 0 : -30 }}
        transition={{ duration: 0.4 }}
      >
        {prefix}
      </motion.span>
      {" "}
      <motion.span
        className="inline-block relative"
        animate={{ opacity: repairPhase >= 1 ? 1 : 0 }}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={repairPhase}
            className={repairPhase < 3 ? "text-destructive/70" : "text-foreground"}
            initial={{ opacity: 0, scale: 0.8, filter: "blur(4px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.4 }}
            style={{ fontFamily: repairPhase < 3 ? "monospace" : "inherit" }}
          >
            {getBrokenText()}
          </motion.span>
        </AnimatePresence>
        
        {repairPhase === 2 && (
          <>
            {[...Array(6)].map((_, i) => (
              <motion.span
                key={i}
                className="absolute w-1 h-1 bg-accent rounded-full"
                style={{ left: `${20 + i * 15}%`, top: "50%" }}
                initial={{ opacity: 1, scale: 0 }}
                animate={{ 
                  opacity: [1, 1, 0],
                  scale: [0, 1.5, 0],
                  y: [0, -20 - Math.random() * 20],
                  x: [0, (Math.random() - 0.5) * 30]
                }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
              />
            ))}
          </>
        )}
      </motion.span>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: repairPhase >= 3 ? 1 : 0 }}
        transition={{ duration: 0.4 }}
      >
        {suffix}
      </motion.span>
    </h1>
  );
}

function ReplacementTitle({ prefix, words, delay }: { 
  prefix: string; 
  words: string[]; 
  delay: number;
}) {
  const [currentIndex, setCurrentIndex] = useState(-1);

  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];
    
    // Timing ajusté pour laisser le temps à la barre de se dessiner (1.5s par mot)
    words.forEach((_, index) => {
      timeouts.push(setTimeout(() => setCurrentIndex(index), delay * 1000 + index * 1500));
    });
    
    return () => timeouts.forEach(clearTimeout);
  }, [delay, words.length]);

  return (
    <h1 className="text-lg sm:text-2xl md:text-4xl lg:text-5xl font-black text-foreground mb-4 sm:mb-6 leading-tight sm:whitespace-nowrap">
      <motion.span
        className="text-accent"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: currentIndex >= 0 ? 1 : 0, y: currentIndex >= 0 ? 0 : 20 }}
        transition={{ duration: 0.5 }}
      >
        {prefix}
      </motion.span>
      {" "}
      <span className="inline-block relative">
        <AnimatePresence mode="wait">
          {currentIndex >= 0 && (
            <motion.span
              key={currentIndex}
              className="inline-block text-foreground relative"
              initial={{ opacity: 0, y: 40, rotateX: -45, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, rotateX: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -40, rotateX: 45, filter: "blur(8px)" }}
              transition={{ duration: 0.6, ease: "easeInOut" as const }}
            >
              {words[currentIndex]}
              {/* Barre rouge animée de gauche à droite pour les mots intermédiaires */}
              {currentIndex < words.length - 1 && (
                <motion.span
                  className="absolute left-0 top-1/2 h-[3px] bg-destructive rounded-full"
                  style={{ transform: "translateY(-50%)" }}
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 0.8, delay: 0.4, ease: "easeInOut" }}
                />
              )}
              {/* Coche verte pour le dernier mot avec confettis */}
              {currentIndex === words.length - 1 && (
                <>
                  <motion.span
                    className="absolute -right-8 top-0 text-green-500"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: [0, 1.3, 1] }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  >
                    ✓
                  </motion.span>
                  {/* Confettis/Particules */}
                  {[...Array(12)].map((_, i) => {
                    const angle = (i * 30) * (Math.PI / 180);
                    const distance = 40 + Math.random() * 25;
                    const colors = ['#22c55e', '#f97316', '#3b82f6', '#eab308', '#ec4899'];
                    const rotation = (Math.random() - 0.5) * 720; // Rotation aléatoire entre -360 et 360 degrés
                    return (
                      <motion.span
                        key={i}
                        className="absolute -right-6 top-2 w-2 h-2 rounded-full"
                        style={{ backgroundColor: colors[i % colors.length] }}
                        initial={{ opacity: 0, scale: 0, x: 0, y: 0, rotate: 0 }}
                        animate={{ 
                          opacity: [0, 1, 1, 0],
                          scale: [0, 1, 0.8, 0],
                          x: Math.cos(angle) * distance,
                          y: Math.sin(angle) * distance,
                          rotate: rotation,
                        }}
                        transition={{ 
                          duration: 0.8, 
                          delay: 0.4 + i * 0.03,
                          ease: "easeOut"
                        }}
                      />
                    );
                  })}
                </>
              )}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </h1>
  );
}

// ========== FEATURE CARD ==========

interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  color: 'primary' | 'accent';
}

function FeatureCard({ icon: Icon, title, description, color }: FeatureCardProps) {
  const iconBg = color === 'primary' 
    ? 'bg-gradient-to-br from-primary to-primary-dark' 
    : 'bg-gradient-to-br from-accent to-accent-dark';
  
  return (
    <motion.div 
      className="group relative bg-card border border-border/50 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 overflow-hidden"
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Subtle gradient overlay on hover */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300 ${color === 'primary' ? 'bg-primary' : 'bg-accent'}`} />
      
      <div className={`relative w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${iconBg} shadow-lg`}>
        <Icon className="w-7 h-7 text-white" />
      </div>
      <h3 className="relative text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">{title}</h3>
      <p className="relative text-muted-foreground text-sm leading-relaxed">{description}</p>
      
      {/* Bottom accent line */}
      <div className={`absolute bottom-0 left-0 right-0 h-1 ${color === 'primary' ? 'bg-primary' : 'bg-accent'} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`} />
    </motion.div>
  );
}
