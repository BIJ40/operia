import { CHANGELOG, CHANGE_TYPE_CONFIG, getCurrentVersion, getPreviousVersions } from '@/config/changelog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function Changelog() {
  const currentVersion = getCurrentVersion();
  const previousVersions = getPreviousVersions();

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

  return (
    <div className="container mx-auto px-4 py-6 space-y-8">
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
            "from-helpconfort-blue/10 via-white to-white",
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

          <div className="space-y-2">
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
                  "from-helpconfort-blue/10 via-white to-white",
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
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
