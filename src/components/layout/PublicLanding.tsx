import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { HomeTilesSection } from '@/components/home/HomeTilesSection';

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
          {/* Title 1: Paint effect - letters appear like being painted */}
          <PaintedTitle 
            text="Pilotez"
            suffix=" votre agence."
            delay={0.3}
          />
          
          {/* Title 2: Repair effect - word appears broken then repairs */}
          <RepairedTitle 
            prefix="Maîtrisez"
            brokenWord="le logiciel"
            suffix=" Apogée."
            delay={2.5}
          />
          
          {/* Title 3: Replacement effect - words swap/replace */}
          <ReplacementTitle 
            prefix="Accédez"
            words={["aux outils", "aux guides", "à toutes les ressources"]}
            delay={5}
          />

          <motion.p 
            className="text-xl text-muted-foreground mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 8 }}
          >
            La plateforme complète pour gérer votre franchise HelpConfort
          </motion.p>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 8.5 }}
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

        {/* Service Tiles with métier animations */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 9, duration: 0.5 }}
          className="max-w-6xl mx-auto"
        >
          <HomeTilesSection />
        </motion.div>
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

// Paint effect: Letters appear one by one like being painted with a brush stroke
function PaintedTitle({ text, suffix, delay }: { text: string; suffix: string; delay: number }) {
  const letters = text.split('');
  
  return (
    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
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
              duration: 0.4,
              delay: delay + (index * 0.12),
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
        transition={{ delay: delay + (letters.length * 0.12) + 0.3, duration: 0.5 }}
      >
        {suffix}
      </motion.span>
    </h1>
  );
}

// Repair effect: Word appears glitchy/broken, then "repairs" itself
function RepairedTitle({ prefix, brokenWord, suffix, delay }: { 
  prefix: string; 
  brokenWord: string; 
  suffix: string; 
  delay: number;
}) {
  const [repairPhase, setRepairPhase] = useState(0);
  
  useEffect(() => {
    const timers = [
      setTimeout(() => setRepairPhase(1), delay * 1000),
      setTimeout(() => setRepairPhase(2), (delay + 0.8) * 1000),
      setTimeout(() => setRepairPhase(3), (delay + 1.6) * 1000),
    ];
    return () => timers.forEach(clearTimeout);
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
    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
      <motion.span
        className="text-primary"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: repairPhase >= 1 ? 1 : 0, x: repairPhase >= 1 ? 0 : -30 }}
        transition={{ duration: 0.5 }}
      >
        {prefix}
      </motion.span>
      {" "}
      <motion.span
        className="inline-block relative"
        initial={{ opacity: 0 }}
        animate={{ opacity: repairPhase >= 1 ? 1 : 0 }}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={repairPhase}
            className={repairPhase < 3 ? "text-destructive/70" : "text-foreground"}
            initial={{ opacity: 0, scale: 0.8, filter: "blur(4px)" }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              filter: "blur(0px)",
            }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.4 }}
            style={{
              fontFamily: repairPhase < 3 ? "monospace" : "inherit",
            }}
          >
            {getBrokenText()}
          </motion.span>
        </AnimatePresence>
        
        {/* Repair sparks effect */}
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
        transition={{ duration: 0.5 }}
      >
        {suffix}
      </motion.span>
    </h1>
  );
}

// Replacement effect: Words cycle through and replace each other
function ReplacementTitle({ prefix, words, delay }: { 
  prefix: string; 
  words: string[]; 
  delay: number;
}) {
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const startTimer = setTimeout(() => {
      setIsVisible(true);
      setCurrentIndex(0);
    }, delay * 1000);

    return () => clearTimeout(startTimer);
  }, [delay]);

  useEffect(() => {
    if (currentIndex >= 0 && currentIndex < words.length - 1) {
      const timer = setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, words.length]);

  return (
    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
      <motion.span
        className="text-accent"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
        transition={{ duration: 0.5 }}
      >
        {prefix}
      </motion.span>
      {" "}
      <span className="inline-block relative min-w-[200px] md:min-w-[400px]">
        <AnimatePresence mode="wait">
          {currentIndex >= 0 && (
            <motion.span
              key={currentIndex}
              className={`inline-block ${currentIndex === words.length - 1 ? "text-foreground" : "text-muted-foreground"}`}
              initial={{ 
                opacity: 0, 
                y: 40,
                rotateX: -45,
                filter: "blur(8px)"
              }}
              animate={{ 
                opacity: 1, 
                y: 0,
                rotateX: 0,
                filter: "blur(0px)"
              }}
              exit={{ 
                opacity: 0, 
                y: -40,
                rotateX: 45,
                filter: "blur(8px)"
              }}
              transition={{ 
                duration: 0.6,
                ease: "easeInOut"
              }}
            >
              {words[currentIndex]}
              {currentIndex < words.length - 1 && (
                <motion.span
                  className="absolute -right-2 top-0 text-destructive"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1, 1, 0.5], rotate: [0, 0, 0, 45] }}
                  transition={{ duration: 1, times: [0, 0.2, 0.8, 1] }}
                >
                  ✗
                </motion.span>
              )}
              {currentIndex === words.length - 1 && (
                <motion.span
                  className="absolute -right-8 top-0 text-green-500"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: [0, 1.3, 1] }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  ✓
                </motion.span>
              )}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </h1>
  );
}
