import { Link } from 'react-router-dom';
import { 
  Settings, Users, Building2, Activity, TrendingUp, Headset, BarChart3, 
  History, Bot, BookOpen, FlaskConical, Sparkles, Database, FileStack, 
  Archive, Bell, HardDrive, HelpCircle, Shield, Brain, Cpu, FileText
} from 'lucide-react';
import { ROUTES } from '@/config/routes';
import { cn } from '@/lib/utils';
import { StatsOverview } from '@/components/admin/overview/StatsOverview';

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

interface AdminSectionProps {
  title: string;
  icon: React.ElementType;
  color: string;
  children: React.ReactNode;
}

function AdminSection({ title, icon: Icon, color, children }: AdminSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b border-border/50">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", color)}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <h2 className="font-semibold text-foreground">{title}</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {children}
      </div>
    </div>
  );
}

// Route protégée par RoleGuard (N5+) dans App.tsx
export default function AdminIndex() {
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

      {/* Sections thématiques */}
      <div className="space-y-6">
        
        {/* DROITS & PERMISSIONS */}
        <AdminSection 
          title="Droits, Permissions & Modules" 
          icon={Shield} 
          color="bg-red-500"
        >
          <AdminLink to={ROUTES.admin.permissionsCenter} icon={Shield} title="Centre de Permissions" description="Rôles, modules et accès" />
          <AdminLink to={ROUTES.admin.users} icon={Users} title="Utilisateurs" description="Gestion des comptes" />
          <AdminLink to={ROUTES.admin.agencies} icon={Building2} title="Agences" description="Configuration agences" />
          <AdminLink to={ROUTES.admin.userActivity} icon={TrendingUp} title="Activité" description="Connexions utilisateurs" />
        </AdminSection>

        {/* INTELLIGENCE ARTIFICIELLE */}
        <AdminSection 
          title="Intelligence Artificielle" 
          icon={Brain} 
          color="bg-purple-500"
        >
          <AdminLink to={ROUTES.admin.helpi} icon={Bot} title="Helpi (RAG)" description="Moteur IA principal" />
          <AdminLink to={ROUTES.admin.apogeeGuides} icon={BookOpen} title="Guides Apogée" description="Base connaissances IA" />
          <AdminLink to={ROUTES.admin.statia} icon={FlaskConical} title="STATiA-BY-BIJ" description="Moteur de métriques" />
          <AdminLink to={ROUTES.admin.formationGenerator} icon={Sparkles} title="Générateur Formation" description="Résumés pédagogiques IA" />
        </AdminSection>

        {/* SUPPORT */}
        <AdminSection 
          title="Support & Assistance" 
          icon={Headset} 
          color="bg-green-500"
        >
          <AdminLink to={ROUTES.support.console} icon={Headset} title="Console Support" description="Tickets clients" />
          <AdminLink to={ROUTES.admin.supportStats} icon={BarChart3} title="Statistiques Support" description="Métriques et KPIs" />
          <AdminLink to={ROUTES.admin.escalationHistory} icon={History} title="Historique Escalades" description="Escalades chatbot" />
          <AdminLink to={ROUTES.admin.faq} icon={HelpCircle} title="FAQ" description="Questions fréquentes" />
        </AdminSection>

        {/* DONNÉES & SAUVEGARDES */}
        <AdminSection 
          title="Données & Sauvegardes" 
          icon={Database} 
          color="bg-blue-500"
        >
          <AdminLink to={ROUTES.admin.backup} icon={Database} title="Sauvegardes" description="Export/import données" />
          <AdminLink to={ROUTES.admin.helpconfortBackup} icon={FileStack} title="HelpConfort Backup" description="Sauvegarde spécifique" />
          <AdminLink to={ROUTES.admin.cacheBackup} icon={Archive} title="Cache Backup" description="Gestion du cache" />
          <AdminLink to={ROUTES.admin.storageQuota} icon={HardDrive} title="Stockage" description="Quotas et espace" />
        </AdminSection>

        {/* SYSTÈME & MONITORING */}
        <AdminSection 
          title="Système & Monitoring" 
          icon={Cpu} 
          color="bg-orange-500"
        >
          <AdminLink to={ROUTES.admin.systemHealth} icon={Activity} title="Santé Système" description="Surveillance services" />
          <AdminLink to={ROUTES.admin.pageMetadata} icon={FileText} title="Métadonnées Pages" description="Titres et labels" />
          <AdminLink to={ROUTES.admin.announcements} icon={Bell} title="Annonces Prioritaires" description="Diffusion messages" />
        </AdminSection>

      </div>
    </div>
  );
}
