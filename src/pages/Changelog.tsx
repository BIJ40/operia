import { CHANGELOG, CHANGE_TYPE_CONFIG, getCurrentVersion, getPreviousVersions } from '@/config/changelog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FileText, ExternalLink, ChevronDown, ChevronUp, Map, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { WarmPageContainer } from '@/components/ui/warm-page-container';
import { WarmCard } from '@/components/ui/warm-card';

export default function Changelog() {
  const currentVersion = getCurrentVersion();
  const previousVersions = getPreviousVersions();
  const [expandedAudits, setExpandedAudits] = useState<string | null>(currentVersion.version);

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
            className="mt-4 text-warm-purple hover:text-warm-purple/80 hover:bg-warm-purple/10 gap-2 rounded-xl"
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 p-4 bg-warm-purple/5 rounded-xl border border-warm-purple/20">
            {version.auditLinks.map((link, idx) => (
              <a
                key={idx}
                href={link.path}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-warm-purple bg-background rounded-lg border border-warm-purple/20 hover:bg-warm-purple/10 hover:border-warm-purple/30 transition-colors"
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
    <WarmPageContainer 
      maxWidth="4xl" 
      title="Journal des mises à jour"
      description="Pour test"
      headerRight={
        <Link 
          to="/roadmap"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-warm-blue/20 to-warm-teal/20 border border-warm-blue/30 hover:border-warm-blue/50 transition-colors text-sm font-medium text-warm-blue"
        >
          <Map className="w-4 h-4" />
          Voir la Roadmap
        </Link>
      }
    >
      {/* Version actuelle */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold text-foreground">Version actuelle</h2>
          <Badge className="bg-warm-green/20 text-warm-green border-warm-green/30 rounded-lg">
            <Sparkles className="w-3 h-3 mr-1" />
            En cours
          </Badge>
        </div>
        
        <WarmCard 
          variant="gradient" 
          accentColor="blue" 
          padding="spacious"
          className="border-l-4 border-l-warm-blue"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold text-foreground mb-1">{currentVersion.version}</h3>
              <p className="text-sm text-muted-foreground">{currentVersion.title}</p>
            </div>
            <span className="text-sm font-medium text-muted-foreground bg-muted/50 px-3 py-1 rounded-lg">
              {currentVersion.date}
            </span>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {currentVersion.changes.map((change, idx) => {
              const config = CHANGE_TYPE_CONFIG[change.type];
              return (
                <div key={idx} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <Badge className={cn(config.bgClass, config.textClass, 'shrink-0 rounded-lg')}>
                    <span className="mr-1">{config.emoji}</span>
                    {config.label}
                  </Badge>
                  <span className="text-sm text-foreground">{change.description}</span>
                </div>
              );
            })}
          </div>

          {renderAuditLinks(currentVersion)}
        </WarmCard>
      </section>

      {/* Versions précédentes */}
      {previousVersions.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">Versions précédentes</h2>
          <div className="space-y-4">
            {previousVersions.map((version) => (
              <WarmCard 
                key={version.version}
                variant="default"
                hover
                padding="normal"
                className="border-l-4 border-l-muted-foreground/30"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{version.version}</h3>
                    <p className="text-xs text-muted-foreground">{version.title}</p>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded-lg">
                    {version.date}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {version.changes.map((change, idx) => {
                    const config = CHANGE_TYPE_CONFIG[change.type];
                    return (
                      <div key={idx} className="flex items-start gap-2">
                        <Badge className={cn(config.bgClass, config.textClass, 'shrink-0 text-xs rounded-lg')}>
                          <span className="mr-1">{config.emoji}</span>
                          {config.label}
                        </Badge>
                        <span className="text-xs text-foreground">{change.description}</span>
                      </div>
                    );
                  })}
                </div>

                {renderAuditLinks(version)}
              </WarmCard>
            ))}
          </div>
        </section>
      )}
    </WarmPageContainer>
  );
}
