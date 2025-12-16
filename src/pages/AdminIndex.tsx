import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Settings, Users, Building2, Activity, TrendingUp, Headset, BarChart3, 
  History, Bot, BookOpen, FlaskConical, Sparkles, Database, FileStack, 
  Archive, Bell, HardDrive, HelpCircle, Shield, Brain, Cpu, FileText, FileJson,
  FileEdit
} from 'lucide-react';
import { ROUTES } from '@/config/routes';
import { cn } from '@/lib/utils';
import { StatsOverview } from '@/components/admin/overview/StatsOverview';
import { DatabaseExportButton } from '@/components/admin/DatabaseExportButton';
import { MaintenanceModeCard } from '@/components/admin/MaintenanceModeCard';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AdminLinkProps {
  to: string;
  icon: React.ElementType;
  title: string;
  description?: string;
}

function AdminLink({ to, icon: Icon, title, description }: AdminLinkProps) {
  return (
    <Link 
      to={to}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg transition-all",
        "bg-card/50 hover:bg-primary/5 border border-border/50 hover:border-primary/30",
        "group"
      )}
    >
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm text-foreground truncate">{title}</h4>
        {description && (
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        )}
      </div>
    </Link>
  );
}

// Route protégée par RoleGuard (N5+) dans App.tsx
export default function AdminIndex() {
  const { hasGlobalRole } = useAuth();
  const isSuperadmin = hasGlobalRole('superadmin');
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') || 'gestion';
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  // Sync tab with URL
  useEffect(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  return (
    <div className="container max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border/50">
        <div className="w-12 h-12 rounded-xl bg-helpconfort-blue/10 flex items-center justify-center">
          <Settings className="w-6 h-6 text-helpconfort-blue" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Administration</h1>
          <p className="text-sm text-muted-foreground">Centre de contrôle HC Services</p>
        </div>
      </div>

      {/* Stats Overview */}
      <StatsOverview />

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="gestion" className="gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Gestion</span>
          </TabsTrigger>
          <TabsTrigger value="ia" className="gap-2">
            <Brain className="w-4 h-4" />
            <span className="hidden sm:inline">IA</span>
          </TabsTrigger>
          <TabsTrigger value="support" className="gap-2">
            <Headset className="w-4 h-4" />
            <span className="hidden sm:inline">Support</span>
          </TabsTrigger>
          <TabsTrigger value="donnees" className="gap-2">
            <Database className="w-4 h-4" />
            <span className="hidden sm:inline">Données</span>
          </TabsTrigger>
          <TabsTrigger value="systeme" className="gap-2">
            <Cpu className="w-4 h-4" />
            <span className="hidden sm:inline">Système</span>
          </TabsTrigger>
        </TabsList>

        {/* Gestion */}
        <TabsContent value="gestion" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <AdminLink to="/admin/gestion" icon={Shield} title="Gestion Globale" description="Utilisateurs, agences, plans et permissions" />
            <AdminLink to={ROUTES.admin.userActivity} icon={TrendingUp} title="Activité" description="Connexions utilisateurs" />
          </div>
        </TabsContent>

        {/* IA */}
        <TabsContent value="ia" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <AdminLink to={ROUTES.admin.helpi} icon={Bot} title="Helpi (RAG)" description="Moteur IA principal" />
            <AdminLink to={ROUTES.admin.apogeeGuides} icon={BookOpen} title="Guides Apogée" description="Base connaissances IA" />
            <AdminLink to={ROUTES.admin.statia} icon={FlaskConical} title="STATiA-BY-BIJ" description="Moteur de métriques" />
            <AdminLink to={ROUTES.admin.formationGenerator} icon={Sparkles} title="Générateur Formation" description="Résumés pédagogiques IA" />
          </div>
        </TabsContent>

        {/* Support */}
        <TabsContent value="support" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <AdminLink to={ROUTES.support.console} icon={Headset} title="Console Support" description="Tickets clients" />
            <AdminLink to={ROUTES.admin.supportStats} icon={BarChart3} title="Statistiques Support" description="Métriques et KPIs" />
            <AdminLink to={ROUTES.admin.escalationHistory} icon={History} title="Historique Escalades" description="Escalades chatbot" />
            <AdminLink to={ROUTES.admin.faq} icon={HelpCircle} title="FAQ" description="Questions fréquentes" />
          </div>
        </TabsContent>

        {/* Données */}
        <TabsContent value="donnees" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <AdminLink to={ROUTES.admin.backup} icon={Database} title="Sauvegardes" description="Export/import données" />
            <AdminLink to={ROUTES.admin.helpconfortBackup} icon={FileStack} title="HelpConfort Backup" description="Sauvegarde spécifique" />
            <AdminLink to={ROUTES.admin.cacheBackup} icon={Archive} title="Cache Backup" description="Gestion du cache" />
            <AdminLink to={ROUTES.admin.storageQuota} icon={HardDrive} title="Stockage" description="Quotas et espace" />
          </div>
          {/* Export Rapide */}
          <div className="flex items-center gap-4 p-4 rounded-lg border border-border/50 bg-card/50">
            <Database className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <h4 className="font-medium text-sm">Export complet de la base de données</h4>
              <p className="text-xs text-muted-foreground">Télécharger toutes vos données au format JSON</p>
            </div>
            <DatabaseExportButton />
          </div>
        </TabsContent>

        {/* Système */}
        <TabsContent value="systeme" className="space-y-4">
          {/* Mode Maintenance - Visible uniquement pour N6 */}
          {isSuperadmin && <MaintenanceModeCard compact />}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <AdminLink to={ROUTES.admin.systemHealth} icon={Activity} title="Santé Système" description="Surveillance services" />
            <AdminLink to={ROUTES.admin.pageMetadata} icon={FileText} title="Métadonnées Pages" description="Titres et labels" />
            <AdminLink to={ROUTES.admin.announcements} icon={Bell} title="Annonces Prioritaires" description="Diffusion messages" />
            <AdminLink to="/admin/apogee-report" icon={FileJson} title="Rapport Apogée API" description="Analyse endpoints & champs" />
            <AdminLink to="/admin/templates" icon={FileEdit} title="Templates DocGen" description="Modèles de documents" />
            <AdminLink to="/admin/rapportactivite" icon={FileText} title="Rapports d'Activité" description="Config rapports mensuels" />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}