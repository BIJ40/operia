/**
 * Carte collaborateur compacte pour la liste
 */

import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  User, 
  Wrench,
  Headphones,
  Briefcase,
  Building2,
  HelpCircle
} from 'lucide-react';
import { Collaborator, CollaboratorType } from '@/types/collaborator';

interface CollaboratorCardProps {
  collaborator: Collaborator;
}

const TYPE_CONFIG: Record<CollaboratorType, { icon: typeof User; color: string; bgColor: string }> = {
  TECHNICIEN: { icon: Wrench, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  ADMINISTRATIF: { icon: Headphones, color: 'text-pink-600', bgColor: 'bg-pink-100' },
  DIRIGEANT: { icon: Building2, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  COMMERCIAL: { icon: Briefcase, color: 'text-green-600', bgColor: 'bg-green-100' },
  AUTRE: { icon: HelpCircle, color: 'text-gray-600', bgColor: 'bg-gray-100' },
};

export function CollaboratorCard({ collaborator }: CollaboratorCardProps) {
  const config = TYPE_CONFIG[collaborator.type as CollaboratorType] || TYPE_CONFIG.AUTRE;
  const Icon = config.icon;
  const initials = `${collaborator.first_name?.[0] || ''}${collaborator.last_name?.[0] || ''}`.toUpperCase();
  const isActive = !collaborator.leaving_date;

  return (
    <Link to={`/rh/suivi/${collaborator.id}`}>
      <Card className={`
        p-3 hover:shadow-md transition-all cursor-pointer
        hover:border-helpconfort-blue/30 hover:-translate-y-0.5
        ${!isActive ? 'opacity-60' : ''}
      `}>
        <div className="flex items-center gap-3">
          {/* Avatar compact */}
          <Avatar className={`h-10 w-10 ${config.bgColor} flex-shrink-0`}>
            <AvatarFallback className={`${config.color} text-sm font-medium`}>
              {initials || <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>

          {/* Info minimale */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate text-sm">
              {collaborator.first_name} {collaborator.last_name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Icon className={`h-3 w-3 ${config.color}`} />
              <span className="text-xs text-muted-foreground truncate">
                {collaborator.role || collaborator.type}
              </span>
              {!isActive && (
                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                  Parti
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
