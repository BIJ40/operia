import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface NavigationWidgetProps {
  title: string;
  description: string;
  link: string;
  icon: string;
  isLocked?: boolean;
}

export function NavigationWidget({
  title,
  description,
  link,
  icon,
  isLocked = false,
}: NavigationWidgetProps) {
  const { toast } = useToast();
  const Icon = (Icons as any)[icon] || Icons.BookOpen;

  if (isLocked) {
    return (
      <div
        onClick={() => {
          toast({
            title: 'Accès restreint',
            description: 'Vous n\'avez pas les permissions pour accéder à cette section',
            variant: 'destructive',
          });
        }}
        className="h-full group relative border-2 border-primary/20 border-l-4 border-l-accent bg-gradient-to-r from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 rounded-2xl p-4 hover:shadow-lg hover:border-primary/40 hover:scale-[1.02] transition-all duration-300 flex items-center gap-3 cursor-pointer opacity-60"
      >
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Lock className="w-12 h-12 text-destructive drop-shadow-lg" />
        </div>
        
        <Icon className="w-12 h-12 text-primary flex-shrink-0 opacity-50" />
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-foreground truncate">{title}</h2>
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        </div>
      </div>
    );
  }

  return (
    <Link
      to={link}
      className="h-full group relative border-2 border-primary/20 border-l-4 border-l-accent bg-gradient-to-r from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 rounded-2xl p-4 hover:shadow-lg hover:border-primary/40 hover:scale-[1.02] transition-all duration-300 flex items-center gap-3"
    >
      <Icon className="w-12 h-12 text-primary flex-shrink-0 group-hover:scale-110 transition-transform duration-300" />
      <div className="flex-1 min-w-0">
        <h2 className="text-lg font-bold text-foreground truncate">{title}</h2>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
    </Link>
  );
}
