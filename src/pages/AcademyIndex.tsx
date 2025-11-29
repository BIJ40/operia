import { BookOpen, FileText, FolderOpen } from 'lucide-react';
import { IndexTile, getVariantForIndex } from '@/components/ui/index-tile';
import { ROUTES } from '@/config/routes';
import { useMenuLabels } from '@/hooks/use-page-metadata';

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

export default function AcademyIndex() {
  const menuLabels = useMenuLabels();

  const getModuleTitle = (module: typeof academyModules[0]): string => {
    const pageKey = ROUTE_TO_PAGE_KEY[module.href];
    if (pageKey && menuLabels.has(pageKey)) {
      return menuLabels.get(pageKey)!;
    }
    return module.title;
  };

  return (
    <div className="container mx-auto py-8 px-4">
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
      </div>
    </div>
  );
}
