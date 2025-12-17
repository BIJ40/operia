import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  BookOpen, 
  Headset, 
  Network, 
  LogIn, 
  Building2, 
  Users,
  FileText,
  UserCheck,
  CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DemoCarousel } from '@/components/landing/DemoCarousel';
import operiaLogo from '@/assets/operia-logo.png';

interface PublicLandingProps {
  onLoginClick: () => void;
}

export function PublicLanding({ onLoginClick }: PublicLandingProps) {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950/10 via-background to-indigo-950/10">
      {/* Header OPER.IA */}
      <header className="w-full bg-gradient-to-r from-blue-900 to-indigo-800">
        <div className="container mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img src={operiaLogo} alt="OPER.IA" className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
            <span className="text-white font-bold text-lg sm:text-xl">OPER.IA</span>
            <span className="text-blue-200 text-xs sm:text-sm hidden sm:inline ml-2">Intelligence Opérationnelle</span>
          </div>
          <Button 
            onClick={onLoginClick}
            variant="ghost" 
            className="text-white hover:bg-white/10 gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span className="hidden sm:inline">Se connecter</span>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-12 md:py-20">
        <div className="text-center max-w-5xl mx-auto mb-12">
          {/* Title 1: Paint effect */}
          <PaintedTitle 
            text="Pilotez"
            suffix={<> votre réseau d'agences.</>}
            delay={0.2}
          />
          
          {/* Title 2: Repair effect */}
          <RepairedTitle 
            prefix="Maîtrisez"
            brokenWord="vos opérations"
            suffix=" en temps réel."
            delay={1.6}
          />
          
          {/* Title 3: Replacement effect */}
          <ReplacementTitle 
            prefix="Accédez"
            words={["à la data", "à la formation", "à toutes les ressources"]}
            delay={3.5}
          />

          <motion.p 
            className="text-lg sm:text-xl text-muted-foreground mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.8 }}
          >
            La plateforme d'intelligence opérationnelle pour les réseaux multi-sites
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
              className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xl hover:shadow-2xl transition-all text-base sm:text-lg px-6 py-4 sm:px-8 sm:py-6"
            >
              <LogIn className="w-5 h-5 sm:w-6 sm:h-6" />
              Accéder à mon espace
            </Button>
            <Button 
              onClick={() => navigate('/apporteur')}
              size="lg"
              variant="outline"
              className="gap-2 border-blue-400/30 hover:bg-blue-500/5 hover:border-blue-400/50 transition-all text-base sm:text-lg px-6 py-4 sm:px-8 sm:py-6"
            >
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              Accès Apporteur
            </Button>
          </motion.div>
        </div>

        {/* Demo Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 2.5 }}
          className="mb-16"
        >
          <DemoCarousel />
        </motion.div>

        {/* 12+ Modules Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 3 }}
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 text-foreground">
            12+ modules pour piloter votre activité
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-6xl mx-auto">
            <FeatureCard
              icon={BarChart3}
              title="StatIA"
              description="Analysez vos KPIs, CA, tendances en temps réel avec IA conversationnelle."
              gradient="from-blue-600 to-indigo-700"
            />
            <FeatureCard
              icon={BookOpen}
              title="Academy"
              description="Guides interactifs, FAQ, ressources pour former vos équipes."
              gradient="from-emerald-600 to-teal-700"
            />
            <FeatureCard
              icon={Headset}
              title="Support"
              description="Ticketing, chat IA, base de connaissances centralisée."
              gradient="from-violet-600 to-purple-700"
            />
            <FeatureCard
              icon={Users}
              title="RH & Parc"
              description="Collaborateurs, véhicules, EPI, documents RH automatisés."
              gradient="from-orange-600 to-amber-700"
            />
            <FeatureCard
              icon={FileText}
              title="DocGen"
              description="Templates, tokens intelligents, génération PDF en direct."
              gradient="from-rose-600 to-pink-700"
            />
            <FeatureCard
              icon={Network}
              title="Réseau"
              description="Pilotage multi-agences, comparatifs, alertes réseau."
              gradient="from-cyan-600 to-blue-700"
            />
            <FeatureCard
              icon={UserCheck}
              title="Suivi Client"
              description="Lien sécurisé client : RDV, avancement, historique en temps réel."
              gradient="from-green-600 to-emerald-700"
            />
            <FeatureCard
              icon={CreditCard}
              title="Paiements"
              description="Règlement CB via Stripe : franchise, reste à charge, paiement sécurisé."
              gradient="from-indigo-600 to-violet-700"
            />
          </div>
        </motion.div>
      </section>

      {/* Footer OPER.IA */}
      <footer className="border-t bg-gradient-to-r from-blue-900/5 to-indigo-800/5 py-8 mt-auto">
        <div className="container mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src={operiaLogo} alt="OPER.IA" className="w-6 h-6 object-contain" />
            <span className="font-bold text-foreground">OPER.IA</span>
          </div>
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} OPER.IA - Intelligence Opérationnelle pour réseaux multi-sites
          </p>
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
            className="text-blue-600 inline-block"
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
        className="text-blue-600"
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
                className="absolute w-1 h-1 bg-orange-500 rounded-full"
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
    
    words.forEach((_, index) => {
      timeouts.push(setTimeout(() => setCurrentIndex(index), delay * 1000 + index * 1500));
    });
    
    return () => timeouts.forEach(clearTimeout);
  }, [delay, words.length]);

  return (
    <h1 className="text-lg sm:text-2xl md:text-4xl lg:text-5xl font-black text-foreground mb-4 sm:mb-6 leading-tight sm:whitespace-nowrap">
      <motion.span
        className="text-indigo-600"
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
              {currentIndex < words.length - 1 && (
                <motion.span
                  className="absolute left-0 top-1/2 h-[3px] bg-destructive rounded-full"
                  style={{ transform: "translateY(-50%)" }}
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 0.8, delay: 0.4, ease: "easeInOut" }}
                />
              )}
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
                  {[...Array(12)].map((_, i) => {
                    const angle = (i * 30) * (Math.PI / 180);
                    const distance = 40 + Math.random() * 25;
                    const colors = ['#22c55e', '#3b82f6', '#6366f1', '#eab308', '#14b8a6'];
                    const rotation = (Math.random() - 0.5) * 720;
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
  gradient: string;
}

function FeatureCard({ icon: Icon, title, description, gradient }: FeatureCardProps) {
  return (
    <motion.div 
      className="group relative bg-card border border-border/50 rounded-2xl p-5 sm:p-6 hover:shadow-xl transition-all duration-300 overflow-hidden"
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300 bg-gradient-to-br ${gradient}`} />
      
      <div className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br ${gradient} shadow-lg`}>
        <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
      </div>
      <h3 className="relative text-base sm:text-lg font-bold text-foreground mb-2 group-hover:text-blue-600 transition-colors">{title}</h3>
      <p className="relative text-muted-foreground text-sm leading-relaxed">{description}</p>
      
      <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`} />
    </motion.div>
  );
}
