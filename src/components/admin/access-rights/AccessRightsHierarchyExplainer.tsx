/**
 * Composant explicatif de la hiérarchie des droits
 * Explique clairement quelle règle prend le dessus sur quelle autre
 */

import { Info, ChevronDown, ChevronUp, HelpCircle, Shield, Building2, User, Layers, FileDown } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useState } from 'react';
import { downloadModulesDocumentationPdf } from '@/lib/modulesExportPdf';
import { toast } from 'sonner';

// Bannière d'information globale
export function AccessRightsGlobalBanner() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      await downloadModulesDocumentationPdf();
      toast.success('Documentation PDF téléchargée');
    } catch (error) {
      console.error('Erreur téléchargement PDF:', error);
      toast.error('Erreur lors du téléchargement');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900">
      <Info className="h-5 w-5 text-blue-600" />
      <AlertTitle className="text-blue-800 dark:text-blue-200 font-semibold">
        Comment fonctionnent les droits d'accès ?
      </AlertTitle>
      <AlertDescription className="text-blue-700 dark:text-blue-300">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="flex items-start justify-between">
            <p className="mt-1">
              Les accès modules sont déterminés par une <strong>hiérarchie de priorité</strong>. 
              Les niveaux supérieurs l'emportent toujours sur les niveaux inférieurs.
            </p>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900"
                onClick={handleDownloadPdf}
                disabled={isDownloading}
              >
                <FileDown className="h-4 w-4 mr-1" />
                {isDownloading ? 'Téléchargement...' : 'PDF Modules'}
              </Button>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900">
                  {isOpen ? (
                    <>Réduire <ChevronUp className="h-4 w-4 ml-1" /></>
                  ) : (
                    <>Voir la hiérarchie <ChevronDown className="h-4 w-4 ml-1" /></>
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
          
          <CollapsibleContent className="mt-4">
            <HierarchyDiagram />
          </CollapsibleContent>
        </Collapsible>
      </AlertDescription>
    </Alert>
  );
}

// Diagramme de hiérarchie avec exemples
export function HierarchyDiagram() {
  return (
    <div className="space-y-4">
      {/* Diagramme visuel */}
      <div className="flex flex-col gap-2 bg-white dark:bg-gray-900 p-4 rounded-lg border">
        <h4 className="font-semibold text-foreground mb-2">Hiérarchie de priorité (du plus fort au plus faible) :</h4>
        
        <div className="flex items-center gap-3 p-3 bg-purple-100 dark:bg-purple-900/40 rounded-lg border-l-4 border-purple-500">
          <Badge className="bg-purple-500 text-white">1</Badge>
          <Shield className="h-5 w-5 text-purple-600" />
          <div>
            <div className="font-semibold text-purple-800 dark:text-purple-200">Rôle Global N5/N6</div>
            <div className="text-sm text-purple-700 dark:text-purple-300">
              Les administrateurs plateforme et superadmins ont accès à <strong>TOUS</strong> les modules, sans exception.
            </div>
          </div>
        </div>
        
        <div className="flex justify-center">
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
        
        <div className="flex items-center gap-3 p-3 bg-green-100 dark:bg-green-900/40 rounded-lg border-l-4 border-green-500">
          <Badge className="bg-green-500 text-white">2</Badge>
          <User className="h-5 w-5 text-green-600" />
          <div>
            <div className="font-semibold text-green-800 dark:text-green-200">Modules utilisateur (user_modules)</div>
            <div className="text-sm text-green-700 dark:text-green-300">
              Les modules activés directement sur le profil utilisateur <strong>s'ajoutent</strong> au plan agence.
              <br />
              <em className="text-xs">→ Un module activé ici sera accessible même si le plan ne l'inclut pas.</em>
            </div>
          </div>
        </div>
        
        <div className="flex justify-center">
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
        
        <div className="flex items-center gap-3 p-3 bg-orange-100 dark:bg-orange-900/40 rounded-lg border-l-4 border-orange-500">
          <Badge className="bg-orange-500 text-white">3</Badge>
          <Building2 className="h-5 w-5 text-orange-600" />
          <div>
            <div className="font-semibold text-orange-800 dark:text-orange-200">Overrides agence (agency_module_overrides)</div>
            <div className="text-sm text-orange-700 dark:text-orange-300">
              Des modules supplémentaires peuvent être forcés pour une agence spécifique, en plus de son plan.
            </div>
          </div>
        </div>
        
        <div className="flex justify-center">
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
        
        <div className="flex items-center gap-3 p-3 bg-blue-100 dark:bg-blue-900/40 rounded-lg border-l-4 border-blue-500">
          <Badge className="bg-blue-500 text-white">4</Badge>
          <Layers className="h-5 w-5 text-blue-600" />
          <div>
            <div className="font-semibold text-blue-800 dark:text-blue-200">Plan agence (plan_tier_modules)</div>
            <div className="text-sm text-blue-700 dark:text-blue-300">
              Le plan souscrit par l'agence (FREE, STARTER, PRO) définit les modules de base.
              <br />
              <em className="text-xs">→ C'est la base, qui peut être enrichie par les niveaux supérieurs.</em>
            </div>
          </div>
        </div>
      </div>
      
      {/* Exemples concrets */}
      <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg border border-amber-200 dark:border-amber-900">
        <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-2">
          <HelpCircle className="h-4 w-4" />
          Exemples concrets
        </h4>
        <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-2">
          <li className="flex gap-2">
            <span className="font-mono text-xs bg-amber-200 dark:bg-amber-800 px-1 rounded">Ex 1</span>
            <span>
              Agence en <strong>STARTER</strong> sans module "StatIA". 
              Vous activez "StatIA" sur le profil utilisateur → <strong>L'utilisateur a accès à StatIA</strong>.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-mono text-xs bg-amber-200 dark:bg-amber-800 px-1 rounded">Ex 2</span>
            <span>
              Agence en <strong>PRO</strong> avec module "RH". 
              L'utilisateur n'a pas le module RH activé sur son profil → <strong>Il a quand même accès via le plan</strong>.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-mono text-xs bg-amber-200 dark:bg-amber-800 px-1 rounded">Ex 3</span>
            <span>
              Utilisateur <strong>N5</strong> (platform_admin) dans une agence FREE → <strong>Il a accès à tous les modules</strong> (bypass absolu).
            </span>
          </li>
        </ul>
      </div>
      
      {/* Formule résumée */}
      <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg font-mono text-sm text-center">
        <code className="text-foreground">
          Accès module = (N5/N6) OU (user_modules) OU (agency_overrides) OU (plan_agence)
        </code>
      </div>
    </div>
  );
}

// Tooltip d'aide pour les champs individuels
interface HierarchyTooltipProps {
  context: 'user' | 'agency' | 'plan';
  children: React.ReactNode;
}

export function HierarchyTooltip({ context, children }: HierarchyTooltipProps) {
  const messages = {
    user: "Les modules activés ici s'ajoutent à ceux du plan agence. Priorité 2/4 dans la hiérarchie.",
    agency: "Ces overrides s'ajoutent au plan de base de l'agence. Priorité 3/4 dans la hiérarchie.",
    plan: "Ce plan définit les modules de base pour toutes les agences abonnées. Priorité 4/4 (le plus bas).",
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p>{messages[context]}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Info box pour chaque onglet
interface TabInfoBoxProps {
  tab: 'users' | 'subscriptions' | 'plans';
}

export function TabInfoBox({ tab }: TabInfoBoxProps) {
  const content = {
    users: {
      icon: User,
      title: "Modules utilisateur (Priorité 2/4)",
      description: "Les modules activés directement sur un utilisateur s'ajoutent à ceux de son plan agence. Ils ne peuvent pas être retirés par le plan.",
      color: "green" as const,
    },
    subscriptions: {
      icon: Building2,
      title: "Plans agence (Priorité 4/4)",
      description: "Le plan souscrit par l'agence détermine les modules de base. Tous les utilisateurs de l'agence héritent de ces modules.",
      color: "blue" as const,
    },
    plans: {
      icon: Layers,
      title: "Configuration des plans (Priorité 4/4)",
      description: "Ces configurations définissent les modules inclus dans chaque plan. Les modifications s'appliquent à toutes les agences abonnées.",
      color: "purple" as const,
    },
  };

  const { icon: Icon, title, description, color } = content[tab];

  const colorClasses = {
    green: "border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-900 text-green-800 dark:text-green-200",
    blue: "border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900 text-blue-800 dark:text-blue-200",
    purple: "border-purple-200 bg-purple-50 dark:bg-purple-950/30 dark:border-purple-900 text-purple-800 dark:text-purple-200",
  };

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${colorClasses[color]}`}>
      <Icon className="h-5 w-5 shrink-0 mt-0.5" />
      <div>
        <div className="font-medium">{title}</div>
        <p className="text-sm opacity-90">{description}</p>
      </div>
    </div>
  );
}

// Badge indiquant le niveau de priorité
interface PriorityBadgeProps {
  level: 1 | 2 | 3 | 4;
  showLabel?: boolean;
}

export function PriorityBadge({ level, showLabel = true }: PriorityBadgeProps) {
  const labels = {
    1: { text: "N5/N6 Bypass", color: "bg-purple-500" },
    2: { text: "User Override", color: "bg-green-500" },
    3: { text: "Agency Override", color: "bg-orange-500" },
    4: { text: "Plan Base", color: "bg-blue-500" },
  };

  const { text, color } = labels[level];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={`${color} text-white text-xs cursor-help`}>
            P{level}{showLabel && ` - ${text}`}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Priorité {level}/4 dans la hiérarchie des droits</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
