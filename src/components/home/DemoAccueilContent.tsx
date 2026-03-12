/**
 * DemoAccueilContent - Version démo du dashboard N2+ avec données mockées
 * Même présentation exacte que DashboardStatic pour les N2+, mais données fictives
 * Exception: La carte RDV affiche les vraies données de l'agence DAX
 */

import { motion } from 'framer-motion';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BarChart3, Trophy, PieChart, TrendingUp, Users, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Composants V2 du dashboard
import { WarmCard, HumanTitle, DashboardMapWidget } from '@/components/dashboard/v2';
import { formatEuros, formatPercent } from '@/apogee-connect/utils/formatters';

// Slug de l'agence DAX pour la carte démo
const DEMO_AGENCY_SLUG = 'dax';

// Données mockées réalistes pour la démo
const DEMO_DATA = {
  // KPIs globaux
  kpis: {
    caTotal: 287450,
    tauxTransformation: 72.3,
    panierMoyen: 1250,
    dossiersOuverts: 58,
    devisEmis: 34,
    tauxSAV: 3.2,
  },
  // CA par univers
  caParUnivers: [
    { univers: 'Plomberie', ca: 98500, percent: 34.3 },
    { univers: 'Électricité', ca: 72300, percent: 25.2 },
    { univers: 'Serrurerie', ca: 45200, percent: 15.7 },
    { univers: 'Menuiserie', ca: 38400, percent: 13.4 },
    { univers: 'Vitrerie', ca: 33050, percent: 11.5 },
  ],
  // CA par apporteur
  caParApporteur: [
    { apporteur: 'AXA Assurances', ca: 82300, type: 'Assurance' },
    { apporteur: 'Foncia Gestion', ca: 65400, type: 'Gestion locative' },
    { apporteur: 'Direct Particulier', ca: 54200, type: 'Direct' },
    { apporteur: 'Nexity', ca: 48700, type: 'Syndic' },
    { apporteur: 'MAIF', ca: 36850, type: 'Assurance' },
  ],
  // Top techniciens
  topTechniciens: [
    { nom: 'Jean Dupont', ca: 42500, interventions: 38 },
    { nom: 'Marie Martin', ca: 38200, interventions: 34 },
    { nom: 'Pierre Bernard', ca: 35800, interventions: 31 },
  ],
  // Charge de travail
  chargeTravail: [
    { technicien: 'Jean Dupont', charge: 85, rdvAujourdhui: 4 },
    { technicien: 'Marie Martin', charge: 72, rdvAujourdhui: 3 },
    { technicien: 'Pierre Bernard', charge: 68, rdvAujourdhui: 3 },
    { technicien: 'Luc Moreau', charge: 54, rdvAujourdhui: 2 },
  ],
};

// Animation stagger pour les cartes
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

// Widget KPIs Globaux mockés
function DemoIndicateursGlobaux() {
  const { kpis } = DEMO_DATA;
  
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <div className="bg-gradient-to-br from-warm-green/10 to-warm-teal/5 rounded-xl p-3 border border-warm-green/20">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CA Total HT</p>
        <p className="text-xl font-bold text-foreground mt-1">{formatEuros(kpis.caTotal)}</p>
      </div>
      <div className="bg-gradient-to-br from-warm-blue/10 to-warm-teal/5 rounded-xl p-3 border border-warm-blue/20">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Taux transfo</p>
        <p className="text-xl font-bold text-foreground mt-1">{formatPercent(kpis.tauxTransformation)}</p>
      </div>
      <div className="bg-gradient-to-br from-warm-purple/10 to-warm-blue/5 rounded-xl p-3 border border-warm-purple/20">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Panier moyen</p>
        <p className="text-xl font-bold text-foreground mt-1">{formatEuros(kpis.panierMoyen)}</p>
      </div>
      <div className="bg-gradient-to-br from-warm-orange/10 to-accent/5 rounded-xl p-3 border border-warm-orange/20">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dossiers ouverts</p>
        <p className="text-xl font-bold text-foreground mt-1">{kpis.dossiersOuverts}</p>
      </div>
      <div className="bg-gradient-to-br from-warm-teal/10 to-warm-green/5 rounded-xl p-3 border border-warm-teal/20">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Devis émis</p>
        <p className="text-xl font-bold text-foreground mt-1">{kpis.devisEmis}</p>
      </div>
      <div className="bg-gradient-to-br from-destructive/10 to-warm-orange/5 rounded-xl p-3 border border-destructive/20">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Taux SAV</p>
        <p className="text-xl font-bold text-foreground mt-1">{formatPercent(kpis.tauxSAV)}</p>
      </div>
    </div>
  );
}

// Widget CA par Univers mocké
function DemoCAParUnivers() {
  return (
    <div className="space-y-2">
      {DEMO_DATA.caParUnivers.map((item, index) => (
        <div key={item.univers} className="flex items-center gap-3">
          <div className="w-24 truncate text-sm font-medium">{item.univers}</div>
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-warm-purple to-warm-blue rounded-full transition-all"
              style={{ width: `${item.percent}%` }}
            />
          </div>
          <div className="w-20 text-right text-sm font-semibold text-foreground">
            {formatEuros(item.ca)}
          </div>
        </div>
      ))}
    </div>
  );
}

// Widget CA par Apporteur mocké
function DemoCAApporteurs() {
  return (
    <div className="space-y-2">
      {DEMO_DATA.caParApporteur.slice(0, 4).map((item) => (
        <div key={item.apporteur} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{item.apporteur}</p>
            <p className="text-xs text-muted-foreground">{item.type}</p>
          </div>
          <p className="text-sm font-bold text-primary ml-2">{formatEuros(item.ca)}</p>
        </div>
      ))}
    </div>
  );
}

// Widget Top Techniciens mocké
function DemoTopTechniciens() {
  return (
    <div className="space-y-2">
      {DEMO_DATA.topTechniciens.map((tech, index) => (
        <div 
          key={tech.nom}
          className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
        >
          <span className="w-6 h-6 rounded-full bg-warm-orange/20 text-warm-orange text-xs font-bold flex items-center justify-center shrink-0">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{tech.nom}</p>
            <p className="text-xs text-muted-foreground">{tech.interventions} interventions</p>
          </div>
          <p className="text-sm font-bold text-primary">{formatEuros(tech.ca)}</p>
        </div>
      ))}
    </div>
  );
}

// Widget Charge de travail mocké
function DemoChargeTravail() {
  return (
    <div className="space-y-2">
      {DEMO_DATA.chargeTravail.map((item) => (
        <div key={item.technicien} className="flex items-center gap-3">
          <div className="w-24 truncate text-sm">{item.technicien.split(' ')[0]}</div>
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${
                item.charge > 80 ? 'bg-destructive' : 
                item.charge > 60 ? 'bg-warm-orange' : 'bg-warm-green'
              }`}
              style={{ width: `${item.charge}%` }}
            />
          </div>
          <div className="w-12 text-right text-sm font-medium">{item.charge}%</div>
        </div>
      ))}
    </div>
  );
}

export function DemoAccueilContent() {
  const greeting = getGreeting();

  return (
    <TooltipProvider delayDuration={0}>
      <div className="container mx-auto py-6 px-4 max-w-[1400px]">
        {/* Bandeau d'information démo */}
        <Alert className="mb-6 bg-warning/10 border-warning/30">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-warning-foreground">
            <strong>Mode démonstration</strong> — Les KPIs et statistiques sont des exemples fictifs. 
            La carte affiche les RDV réels de l'agence DAX à titre d'illustration.
          </AlertDescription>
        </Alert>

        {/* Header avec greeting chaleureux */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {greeting} 👋
              </h1>
              <p className="text-muted-foreground mt-1">
                Voici un aperçu de votre activité
              </p>
            </div>
            
            {/* Sélecteur de période désactivé (démo) */}
            <div className="flex flex-wrap items-center gap-1.5">
              {['Année', 'Trim.', 'M-1', 'M'].map((label, i) => (
                <button
                  key={label}
                  disabled
                  className={`h-8 px-3 text-xs rounded-full border transition-colors ${
                    i === 3 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : 'bg-muted/50 text-muted-foreground border-border cursor-not-allowed'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Contenu du dashboard - même layout que N2+ */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* NIVEAU 1 - HERO ROW: Carte RDV + Indicateurs Globaux */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Carte RDV avec vraies données de DAX */}
            <motion.div variants={itemVariants}>
              <DashboardMapWidget agencySlug={DEMO_AGENCY_SLUG} />
            </motion.div>

            {/* Indicateurs Globaux (demi-tuile) */}
            <motion.div variants={itemVariants}>
              <WarmCard
                variant="blue"
                animate={false}
                className="h-full"
              >
                <HumanTitle titleKey="kpis" icon={BarChart3} iconColor="text-warm-blue" size="lg" />
                <div className="mt-4">
                  <DemoIndicateursGlobaux />
                </div>
              </WarmCard>
            </motion.div>
          </div>

          {/* NIVEAU 2 - 4 TUILES ALIGNÉES: CA + Techniciens + Charge */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* CA par Univers */}
            <motion.div variants={itemVariants}>
              <WarmCard
                variant="purple"
                icon={PieChart}
                animate={false}
                className="h-full"
              >
                <HumanTitle titleKey="ca_univers" icon={PieChart} iconColor="text-warm-purple" size="sm" />
                <div className="mt-3">
                  <DemoCAParUnivers />
                </div>
              </WarmCard>
            </motion.div>

            {/* CA par Apporteur */}
            <motion.div variants={itemVariants}>
              <WarmCard
                variant="green"
                icon={TrendingUp}
                animate={false}
                className="h-full"
              >
                <HumanTitle titleKey="ca_apporteurs" icon={TrendingUp} iconColor="text-warm-green" size="sm" />
                <div className="mt-3">
                  <DemoCAApporteurs />
                </div>
              </WarmCard>
            </motion.div>

            {/* Top Techniciens (compact) */}
            <motion.div variants={itemVariants}>
              <WarmCard
                variant="orange"
                icon={Trophy}
                animate={false}
                className="h-full"
              >
                <HumanTitle titleKey="top_techniciens" icon={Trophy} iconColor="text-warm-orange" size="sm" />
                <div className="mt-3">
                  <DemoTopTechniciens />
                </div>
              </WarmCard>
            </motion.div>

            {/* Charge de travail / Productivité */}
            <motion.div variants={itemVariants}>
              <WarmCard
                variant="blue"
                icon={Users}
                animate={false}
                className="h-full"
              >
                <HumanTitle titleKey="productivite" icon={Users} iconColor="text-warm-blue" size="sm" />
                <div className="mt-3">
                  <DemoChargeTravail />
                </div>
              </WarmCard>
            </motion.div>
          </div>
        </motion.div>

        {/* Note de bas de page */}
        <div className="text-center text-xs text-muted-foreground pt-6 mt-6 border-t border-border">
          Ces données sont fictives et servent uniquement à illustrer les fonctionnalités disponibles.
        </div>
      </div>
    </TooltipProvider>
  );
}

export default DemoAccueilContent;
