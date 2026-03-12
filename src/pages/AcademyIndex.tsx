import { BookOpen, FileText, FolderOpen, HelpCircle } from 'lucide-react';
import { IndexTile, getVariantForIndex } from '@/components/ui/index-tile';
import { ROUTES } from '@/config/routes';
import { useMenuLabels } from '@/hooks/use-page-metadata';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layout/PageHeader';
import { useEffectiveModules } from '@/hooks/access-rights/useEffectiveModules';

const ROUTE_TO_PAGE_KEY: Record<string, string> = {
  [ROUTES.academy.apogee]: 'academy_apogee',
  [ROUTES.academy.apporteurs]: 'academy_apporteurs',
  [ROUTES.academy.documents]: 'academy_documents',
};

const academyModules = [
  {
    title: 'Guide Apogée',
    description: 'Guide complet pour maîtriser le logiciel Apogée',
    icon: BookOpen,
    href: ROUTES.academy.apogee,
  },
  {
    title: 'Guide Apporteurs',
    description: 'Ressources pour les apporteurs d\'affaires',
    icon: FileText,
    href: ROUTES.academy.apporteurs,
  },
  {
    title: 'Base Documentaire',
    description: 'Documents et ressources HelpConfort',
    icon: FolderOpen,
    href: ROUTES.academy.documents,
  },
];

// Tuile FAQ non cliquable pour le moment
const faqModule = {
  title: 'FAQ',
  description: 'Questions fréquentes et réponses',
  icon: HelpCircle,
  disabled: true,
};

export default function AcademyIndex() {
  const menuLabels = useMenuLabels();
  const { hasModuleOption } = useEffectiveModules();
  const showFaq = hasModuleOption('support.guides' as any, 'faq');

  const getModuleTitle = (module: typeof academyModules[0]): string => {
    const pageKey = ROUTE_TO_PAGE_KEY[module.href];
    if (pageKey && menuLabels.has(pageKey)) {
      return menuLabels.get(pageKey)!;
    }
    return module.title;
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <PageHeader
        title="Help! Academy"
        subtitle="Documentation, guides et ressources"
        backTo="/"
        backLabel="Accueil"
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {academyModules.map((module, index) => (
          <IndexTile
            key={module.href}
            title={getModuleTitle(module)}
            description={module.description}
            icon={module.icon}
            href={module.href}
            variant={getVariantForIndex(index)}
          />
        ))}

        {/* FAQ Tile - non cliquable, visible seulement si sous-option guides.faq activée */}
        {showFaq && (
        <div className="group h-full rounded-xl p-5
          bg-gradient-to-r from-muted/50 via-muted/30 to-transparent
          border border-muted/40 border-l-4 border-l-muted
          shadow-sm opacity-60 cursor-not-allowed">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-full border-2 border-muted/50 flex items-center justify-center bg-muted/30">
              <faqModule.icon className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-muted-foreground">{faqModule.title}</h3>
                <Badge variant="outline" className="text-xs text-muted-foreground border-muted">
                  Bientôt
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground/70">{faqModule.description}</p>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
