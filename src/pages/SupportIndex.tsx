/**
 * Support Index - HUB page for Support section
 * Displays tiles for all support sub-pages
 */
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/config/routes';
import { IndexTile, getVariantForIndex } from '@/components/ui/index-tile';
import { MessageSquare, FileText, Headset, LucideIcon } from 'lucide-react';

interface SupportModule {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  badge?: string;
  requiresSupport?: boolean;
}

const SUPPORT_MODULES: SupportModule[] = [
  {
    title: 'Centre d\'aide',
    description: 'Chat IA, FAQ et accès rapide à vos demandes',
    icon: MessageSquare,
    href: ROUTES.support.helpcenter,
  },
  {
    title: 'Mes Demandes',
    description: 'Gérer et suivre vos tickets de support',
    icon: FileText,
    href: ROUTES.support.userTickets,
  },
  {
    title: 'Console Support',
    description: 'Traiter les demandes des utilisateurs',
    icon: Headset,
    href: ROUTES.support.console,
    requiresSupport: true,
  },
];

export default function SupportIndex() {
  const { enabledModules } = useAuth();
  
  // Check if user has support agent access
  const supportModule = enabledModules?.support;
  const hasSupportAccess = typeof supportModule === 'object' && supportModule !== null && 'agent' in supportModule && supportModule.agent === true;

  // Filter modules based on user access
  const visibleModules = SUPPORT_MODULES.filter(module => {
    if (module.requiresSupport) {
      return hasSupportAccess;
    }
    return true;
  });

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
          Support
        </h1>
        <p className="text-muted-foreground mt-2">
          Besoin d'aide ? Trouvez des réponses ou contactez notre équipe
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleModules.map((module, index) => (
          <IndexTile
            key={module.href}
            title={module.title}
            description={module.description}
            icon={module.icon}
            href={module.href}
            badge={module.badge}
            variant={getVariantForIndex(index)}
          />
        ))}
      </div>
    </div>
  );
}
