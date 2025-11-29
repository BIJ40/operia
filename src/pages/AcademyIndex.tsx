import { Link } from 'react-router-dom';
import { BookOpen, FileText, FolderOpen } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ROUTES } from '@/config/routes';
import { useMenuLabels } from '@/hooks/use-page-metadata';

// Page keys correspondant aux routes
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
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    title: 'Guide Apporteurs',
    description: 'Ressources pour les apporteurs d\'affaires',
    icon: FileText,
    href: ROUTES.academy.apporteurs,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    title: 'Base Documentaire',
    description: 'Documents et ressources HelpConfort',
    icon: FolderOpen,
    href: ROUTES.academy.documents,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
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
        {academyModules.map((module) => {
          const Icon = module.icon;
          return (
            <Link key={module.href} to={module.href}>
              <Card className="h-full transition-all hover:shadow-lg hover:scale-[1.02] cursor-pointer">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg ${module.bgColor} flex items-center justify-center mb-4`}>
                    <Icon className={`w-6 h-6 ${module.color}`} />
                  </div>
                  <CardTitle>{getModuleTitle(module)}</CardTitle>
                  <CardDescription>{module.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="text-sm text-primary font-medium">
                    Accéder →
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
