import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  BookOpen, 
  Headset, 
  Users, 
  FileText, 
  Network, 
  UserCheck, 
  CreditCard 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModuleSlide {
  id: string;
  title: string;
  icon: React.ElementType;
  screenshot: string | null;
  bulletPoints: string[];
  gradient: string;
}

const MODULES: ModuleSlide[] = [
  {
    id: 'statia',
    title: 'StatIA',
    icon: BarChart3,
    screenshot: '/images/screenshots/statia-hub.png',
    bulletPoints: ['KPIs temps réel', 'Analyse CA & tendances', 'IA conversationnelle'],
    gradient: 'from-blue-600 to-indigo-700',
  },
  {
    id: 'academy',
    title: 'Academy',
    icon: BookOpen,
    screenshot: null,
    bulletPoints: ['Guides interactifs', 'FAQ & tutoriels', 'Formation continue'],
    gradient: 'from-emerald-600 to-teal-700',
  },
  {
    id: 'support',
    title: 'Support',
    icon: Headset,
    screenshot: null,
    bulletPoints: ['Ticketing intelligent', 'Chat IA intégré', 'Base de connaissances'],
    gradient: 'from-violet-600 to-purple-700',
  },
  {
    id: 'rh',
    title: 'RH & Parc',
    icon: Users,
    screenshot: '/images/screenshots/rh-suivi.png',
    bulletPoints: ['Gestion collaborateurs', 'Flotte véhicules', 'EPI & documents'],
    gradient: 'from-orange-600 to-amber-700',
  },
  {
    id: 'docgen',
    title: 'DocGen',
    icon: FileText,
    screenshot: null,
    bulletPoints: ['Templates personnalisés', 'Tokens intelligents', 'PDF en direct'],
    gradient: 'from-rose-600 to-pink-700',
  },
  {
    id: 'reseau',
    title: 'Réseau',
    icon: Network,
    screenshot: null,
    bulletPoints: ['Vision multi-agences', 'Comparatifs réseau', 'Pilotage franchiseur'],
    gradient: 'from-cyan-600 to-blue-700',
  },
  {
    id: 'suivi-client',
    title: 'Suivi Client',
    icon: UserCheck,
    screenshot: null, // Placeholder - ajoutez /images/screenshots/client-rdv.png quand disponible
    bulletPoints: ['Lien sécurisé client', 'Timeline en temps réel', 'Transparence totale'],
    gradient: 'from-green-600 to-emerald-700',
  },
  {
    id: 'paiements',
    title: 'Paiements',
    icon: CreditCard,
    screenshot: null, // Placeholder - ajoutez /images/screenshots/paiement-stripe.png quand disponible
    bulletPoints: ['Paiement CB en ligne', 'Stripe intégré', 'Franchise & reste à charge'],
    gradient: 'from-indigo-600 to-violet-700',
  },
];

const AUTOPLAY_INTERVAL = 5000;

export function DemoCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const goToSlide = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  const nextSlide = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % MODULES.length);
  }, []);

  useEffect(() => {
    if (isPaused) return;
    
    const interval = setInterval(nextSlide, AUTOPLAY_INTERVAL);
    return () => clearInterval(interval);
  }, [isPaused, nextSlide]);

  const activeModule = MODULES[activeIndex];

  return (
    <div 
      className="w-full max-w-5xl mx-auto"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Slide Container */}
      <div className="relative aspect-video rounded-2xl overflow-hidden bg-card border border-border/50 shadow-2xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0"
          >
            {/* Screenshot ou Placeholder */}
            {activeModule.screenshot ? (
              <img
                src={activeModule.screenshot}
                alt={activeModule.title}
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <div className={cn(
                "w-full h-full flex items-center justify-center",
                `bg-gradient-to-br ${activeModule.gradient}`
              )}>
                <activeModule.icon className="w-32 h-32 text-white/30" />
              </div>
            )}

            {/* Overlay Glassmorphism */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Content Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    `bg-gradient-to-br ${activeModule.gradient}`
                  )}>
                    <activeModule.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-white">
                    {activeModule.title}
                  </h3>
                </div>
                <ul className="flex flex-wrap gap-3">
                  {activeModule.bulletPoints.map((point, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.1, duration: 0.3 }}
                      className="flex items-center gap-2 text-white/90 text-sm sm:text-base bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      {point}
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/20">
          <motion.div
            key={activeIndex}
            className={cn("h-full", `bg-gradient-to-r ${activeModule.gradient}`)}
            initial={{ width: "0%" }}
            animate={{ width: isPaused ? `${(1 / MODULES.length) * 100}%` : "100%" }}
            transition={{ duration: isPaused ? 0 : AUTOPLAY_INTERVAL / 1000, ease: "linear" }}
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap justify-center gap-2 mt-6">
        {MODULES.map((module, index) => {
          const Icon = module.icon;
          const isActive = index === activeIndex;
          
          return (
            <button
              key={module.id}
              onClick={() => goToSlide(index)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300",
                isActive
                  ? `bg-gradient-to-r ${module.gradient} text-white shadow-lg scale-105`
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium hidden sm:inline">{module.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
