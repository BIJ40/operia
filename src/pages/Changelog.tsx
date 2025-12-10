import { CHANGELOG, CHANGE_TYPE_CONFIG, getCurrentVersion, getPreviousVersions } from '@/config/changelog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FileText, Shield, ExternalLink, ChevronDown, ChevronUp, Map } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export default function Changelog() {
  const currentVersion = getCurrentVersion();
  const previousVersions = getPreviousVersions();
  const [expandedAudits, setExpandedAudits] = useState<string | null>(currentVersion.version);

  // Helper pour obtenir une direction de gradient stable basée sur le hash du titre
  const getGradientClass = (title: string): string => {
    const hash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const directions = [
      'bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))]',
      'bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))]',
      'bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))]',
      'bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))]',
    ];
    return directions[hash % directions.length];
  };

  const renderAuditLinks = (version: typeof currentVersion) => {
    if (!version.auditLinks?.length) return null;
    
    return (
      <Collapsible 
        open={expandedAudits === version.version}
        onOpenChange={(open) => setExpandedAudits(open ? version.version : null)}
      >
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="mt-4 text-purple-600 hover:text-purple-700 hover:bg-purple-50 gap-2"
          >
            <FileText className="w-4 h-4" />
            Rapports d'audit ({version.auditLinks.length})
            {expandedAudits === version.version ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 p-3 bg-purple-50/50 rounded-lg border border-purple-100">
            {version.auditLinks.map((link, idx) => (
              <a
                key={idx}
                href={link.path}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-purple-700 bg-white rounded-md border border-purple-200 hover:bg-purple-50 hover:border-purple-300 transition-colors"
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{link.label}</span>
                <ExternalLink className="w-3 h-3 shrink-0 opacity-50" />
              </a>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-8">
      {/* Lien Roadmap */}
      <Link 
        to="/roadmap"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-helpconfort-blue/10 to-helpconfort-orange/10 border border-helpconfort-blue/20 hover:border-helpconfort-blue/40 transition-colors text-sm font-medium text-helpconfort-blue"
      >
        <Map className="w-4 h-4" />
        Voir la Roadmap 2026
      </Link>

      {/* Version actuelle */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-bold text-foreground">Version actuelle</h2>
          <Badge className="bg-helpconfort-blue text-white">En cours</Badge>
        </div>
        
        <div
          className={cn(
            "group relative rounded-xl border border-helpconfort-blue/15 p-6",
            getGradientClass(currentVersion.version),
            "from-helpconfort-blue/10 via-background to-background",
            "shadow-sm transition-all duration-300",
            "border-l-4 border-l-helpconfort-blue"
          )}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold text-foreground mb-1">{currentVersion.version}</h3>
              <p className="text-sm text-muted-foreground">{currentVersion.title}</p>
            </div>
            <span className="text-sm font-medium text-muted-foreground">{currentVersion.date}</span>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {currentVersion.changes.map((change, idx) => {
              const config = CHANGE_TYPE_CONFIG[change.type];
              return (
                <div key={idx} className="flex items-start gap-3">
                  <Badge className={cn(config.bgClass, config.textClass, 'shrink-0')}>
                    <span className="mr-1">{config.emoji}</span>
                    {config.label}
                  </Badge>
                  <span className="text-sm text-foreground">{change.description}</span>
                </div>
              );
            })}
          </div>

          {/* Liens rapport sécurité pour V0.6.2 */}
          {currentVersion.version === 'V0.6.2' && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <a 
                href="/security-audit-report"
                className="inline-flex items-center gap-2 text-sm text-helpconfort-blue hover:underline"
              >
                <Shield className="w-4 h-4" />
                Voir le rapport d'audit sécurité complet
              </a>
              <span className="mx-2 text-muted-foreground">•</span>
              <a 
                href="/security-documentation"
                className="inline-flex items-center gap-2 text-sm text-helpconfort-blue hover:underline"
              >
                <FileText className="w-4 h-4" />
                Documentation sécurité
              </a>
            </div>
          )}

          {/* Liens audits */}
          {renderAuditLinks(currentVersion)}
        </div>
      </section>

      {/* Versions précédentes */}
      {previousVersions.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">Versions précédentes</h2>
          <div className="space-y-4">
            {previousVersions.map((version) => (
              <div
                key={version.version}
                className={cn(
                  "group relative rounded-xl border border-helpconfort-blue/15 p-5",
                  getGradientClass(version.version),
                  "from-helpconfort-blue/10 via-background to-background",
                  "shadow-sm transition-all duration-300",
                  "border-l-4 border-l-helpconfort-blue",
                  "hover:from-helpconfort-blue/20 hover:shadow-lg hover:-translate-y-0.5"
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{version.version}</h3>
                    <p className="text-xs text-muted-foreground">{version.title}</p>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">{version.date}</span>
                </div>

                <div className="space-y-1.5">
                  {version.changes.map((change, idx) => {
                    const config = CHANGE_TYPE_CONFIG[change.type];
                    return (
                      <div key={idx} className="flex items-start gap-2">
                        <Badge className={cn(config.bgClass, config.textClass, 'shrink-0 text-xs')}>
                          <span className="mr-1">{config.emoji}</span>
                          {config.label}
                        </Badge>
                        <span className="text-xs text-foreground">{change.description}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Liens audits pour versions précédentes */}
                {renderAuditLinks(version)}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
