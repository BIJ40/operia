/**
 * Carte collaborateur pour la liste
 */

import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  ChevronRight,
  Wrench,
  Headphones,
  Briefcase,
  Building2,
  HelpCircle
} from 'lucide-react';
import { Collaborator, CollaboratorType } from '@/types/collaborator';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CollaboratorCardProps {
  collaborator: Collaborator;
  onEdit?: () => void;
}

const TYPE_CONFIG: Record<CollaboratorType, { icon: typeof User; color: string; bgColor: string }> = {
  TECHNICIEN: { icon: Wrench, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  ASSISTANTE: { icon: Headphones, color: 'text-pink-600', bgColor: 'bg-pink-100' },
  DIRIGEANT: { icon: Building2, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  COMMERCIAL: { icon: Briefcase, color: 'text-green-600', bgColor: 'bg-green-100' },
  AUTRE: { icon: HelpCircle, color: 'text-gray-600', bgColor: 'bg-gray-100' },
};

export function CollaboratorCard({ collaborator, onEdit }: CollaboratorCardProps) {
  const config = TYPE_CONFIG[collaborator.type as CollaboratorType] || TYPE_CONFIG.AUTRE;
  const Icon = config.icon;
  const initials = `${collaborator.first_name?.[0] || ''}${collaborator.last_name?.[0] || ''}`.toUpperCase();
  const isActive = !collaborator.leaving_date;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Avatar className={`h-12 w-12 ${config.bgColor}`}>
            <AvatarFallback className={config.color}>
              {initials || <User className="h-5 w-5" />}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground truncate">
                {collaborator.first_name} {collaborator.last_name}
              </h3>
              {!isActive && (
                <Badge variant="secondary" className="text-xs">
                  Parti
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <Icon className="h-3 w-3" />
                {collaborator.role || collaborator.type}
              </Badge>
              {collaborator.is_registered_user && (
                <Badge variant="default" className="text-xs">
                  Compte actif
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
              {collaborator.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {collaborator.email}
                </span>
              )}
              {collaborator.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {collaborator.phone}
                </span>
              )}
              {collaborator.hiring_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Depuis {format(new Date(collaborator.hiring_date), 'MMM yyyy', { locale: fr })}
                </span>
              )}
            </div>
          </div>

          {/* Action */}
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/hc-agency/collaborateurs/${collaborator.id}`}>
              <ChevronRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
