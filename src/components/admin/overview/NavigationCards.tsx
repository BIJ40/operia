import { Link } from 'react-router-dom';
import { useState } from 'react';
import { 
  Users, 
  Headset, 
  Building2, 
  FileStack,
  TrendingUp,
  HardDrive,
  Database,
  BarChart3,
  Settings,
  BookOpen,
  Activity,
  LucideIcon,
  Bot,
  ChevronDown,
  ChevronRight,
  History,
  Archive,
  Bell,
  FlaskConical,
  Sparkles,
  LayoutGrid
} from 'lucide-react';
import { ROUTES } from '@/config/routes';
import { cn } from '@/lib/utils';

interface AdminTileProps {
  to: string;
  icon: LucideIcon;
  title: string;
  description: string;
  children?: { to: string; icon: LucideIcon; title: string }[];
}

function AdminTile({ to, icon: Icon, title, description, children }: AdminTileProps) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = children && children.length > 0;

  return (
    <div className="h-full">
      <div className="group h-full rounded-xl border border-helpconfort-blue/20 
        bg-gradient-to-br from-background to-helpconfort-blue/5
        shadow-sm transition-all duration-300
        hover:to-helpconfort-blue/15 hover:shadow-lg">
        <div className="flex items-center gap-3 p-4">
          <Link to={to} className="flex-1 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-helpconfort-blue/30 flex items-center justify-center
              group-hover:border-helpconfort-blue group-hover:bg-background/50 transition-all shrink-0">
              <Icon className="w-5 h-5 text-helpconfort-blue" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm truncate">{title}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
            </div>
          </Link>
          {hasChildren && (
            <button 
              onClick={(e) => {
                e.preventDefault();
                setExpanded(!expanded);
              }}
              className="p-1 rounded hover:bg-helpconfort-blue/10 transition-colors"
            >
              {expanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          )}
        </div>
        
        {hasChildren && expanded && (
          <div className="border-t border-helpconfort-blue/10 bg-helpconfort-blue/5 rounded-b-xl">
            {children.map((child) => (
              <Link 
                key={child.to} 
                to={child.to}
                className="flex items-center gap-2 px-4 py-2 text-xs hover:bg-helpconfort-blue/10 transition-colors"
              >
                <child.icon className="w-3.5 h-3.5 text-helpconfort-blue/70" />
                <span className="text-muted-foreground hover:text-foreground">{child.title}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface Section {
  title: string;
  description?: string;
  cards: {
    to: string;
    icon: LucideIcon;
    title: string;
    description: string;
    children?: { to: string; icon: LucideIcon; title: string }[];
  }[];
}

export function NavigationCards() {
  const sections: Section[] = [
    {
      title: 'Gestion Globale',
      description: 'Droits, accès et souscriptions',
      cards: [
        { 
          to: ROUTES.admin.users, 
          icon: Users, 
          title: 'Gestion globale', 
          description: 'Droits, accès et souscriptions',
          children: [
            { to: ROUTES.admin.userActivity, icon: TrendingUp, title: 'Activité connexions' },
          ]
        },
        { to: ROUTES.admin.agencies, icon: Building2, title: 'Agences', description: 'Configurer les agences' },
        { to: ROUTES.admin.userActivity, icon: TrendingUp, title: 'Activité', description: 'Suivi des connexions' },
      ],
    },
    {
      title: 'Gestion de Projet',
      description: 'Tickets et suivi de projet',
      cards: [
        { to: '/?tab=ticketing', icon: Headset, title: 'Ticketing', description: 'Gérer les tickets' },
      ],
    },
    {
      title: 'Intelligence Artificielle & RAG',
      description: 'Chatbot Mme MICHU et base de connaissances',
      cards: [
        { 
          to: ROUTES.admin.helpi, 
          icon: Bot, 
          title: 'Helpi (RAG)', 
          description: 'Gestion complète IA',
          children: [
            { to: ROUTES.admin.apogeeGuides, icon: BookOpen, title: 'Guides Apogée' },
          ]
        },
        { 
          to: ROUTES.admin.apogeeGuides, 
          icon: BookOpen, 
          title: 'Guides Apogée', 
          description: 'Éditer les guides RAG' 
        },
        { 
          to: ROUTES.admin.statia, 
          icon: FlaskConical, 
          title: 'STATiA-BY-BIJ', 
          description: 'Moteur centralisé de métriques' 
        },
        { 
          to: ROUTES.admin.formationGenerator, 
          icon: Sparkles, 
          title: 'Générateur Formation IA', 
          description: 'Résumés pédagogiques Apogée' 
        },
      ],
    },
    {
      title: 'Données & Sauvegardes',
      description: 'Export, import et gestion du cache',
      cards: [
        { 
          to: ROUTES.admin.backup, 
          icon: Database, 
          title: 'Sauvegardes', 
          description: 'Export/import données',
          children: [
            { to: ROUTES.admin.helpconfortBackup, icon: FileStack, title: 'HelpConfort Backup' },
            { to: ROUTES.admin.cacheBackup, icon: Archive, title: 'Cache Backup' },
          ]
        },
        { to: ROUTES.admin.helpconfortBackup, icon: FileStack, title: 'HelpConfort Backup', description: 'Sauvegarde HelpConfort' },
        { to: ROUTES.admin.cacheBackup, icon: Archive, title: 'Cache Backup', description: 'Gestion du cache local' },
      ],
    },
    {
      title: 'Système',
      description: 'Configuration et surveillance',
      cards: [
        { 
          to: ROUTES.admin.announcements, 
          icon: Bell, 
          title: 'Annonces Prioritaires', 
          description: 'Diffuser des informations' 
        },
        { 
          to: ROUTES.admin.systemHealth, 
          icon: Activity, 
          title: 'Santé Système', 
          description: 'Surveillance services',
          children: [
            { to: ROUTES.admin.storageQuota, icon: HardDrive, title: 'Quotas Stockage' },
            { to: ROUTES.admin.pageMetadata, icon: Settings, title: 'Métadonnées Pages' },
          ]
        },
        { to: ROUTES.admin.storageQuota, icon: HardDrive, title: 'Stockage', description: 'Surveiller les quotas' },
        { to: ROUTES.admin.pageMetadata, icon: Settings, title: 'Métadonnées', description: 'Titres et labels pages' },
      ],
    },
  ];

  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <div key={section.title}>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              {section.title}
            </h2>
            {section.description && (
              <p className="text-sm text-muted-foreground">{section.description}</p>
            )}
          </div>
          <div className={cn(
            "grid gap-4",
            section.cards.length <= 3 
              ? "grid-cols-1 md:grid-cols-3" 
              : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
          )}>
            {section.cards.map((card) => (
              <AdminTile
                key={card.to}
                to={card.to}
                icon={card.icon}
                title={card.title}
                description={card.description}
                children={card.children}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
