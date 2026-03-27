/**
 * Avatar coloré pour les collaborateurs RH
 * Couleur basée sur le type de poste
 */

import { cn } from '@/lib/utils';
import { RHCollaborator } from '@/types/rh-suivi';

type CollaboratorType = RHCollaborator['type'];

// Mapping des couleurs par type de poste
const TYPE_COLORS: Record<CollaboratorType, { bg: string; text: string; ring: string }> = {
  TECHNICIEN: {
    bg: 'bg-orange-100 dark:bg-orange-900/40',
    text: 'text-orange-700 dark:text-orange-300',
    ring: 'ring-orange-500/30',
  },
  ADMINISTRATIF: {
    bg: 'bg-pink-100 dark:bg-pink-900/40',
    text: 'text-pink-700 dark:text-pink-300',
    ring: 'ring-pink-500/30',
  },
  DIRIGEANT: {
    bg: 'bg-purple-100 dark:bg-purple-900/40',
    text: 'text-purple-700 dark:text-purple-300',
    ring: 'ring-purple-500/30',
  },
  COMMERCIAL: {
    bg: 'bg-blue-100 dark:bg-blue-900/40',
    text: 'text-blue-700 dark:text-blue-300',
    ring: 'ring-blue-500/30',
  },
  AUTRE: {
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    ring: 'ring-slate-500/30',
  },
};

// Icônes emoji par type
const TYPE_ICONS: Record<CollaboratorType, string> = {
  TECHNICIEN: '🔧',
  ADMINISTRATIF: '📋',
  DIRIGEANT: '👔',
  COMMERCIAL: '💼',
  AUTRE: '👤',
};

interface RHCollaboratorAvatarProps {
  collaborator: RHCollaborator;
  size?: 'sm' | 'md' | 'lg';
  showTypeIcon?: boolean;
  className?: string;
}

export function RHCollaboratorAvatar({
  collaborator,
  size = 'md',
  showTypeIcon = false,
  className,
}: RHCollaboratorAvatarProps) {
  const type = collaborator.type || 'AUTRE';
  const colors = TYPE_COLORS[type] || TYPE_COLORS.AUTRE;
  const typeIcon = TYPE_ICONS[type] || TYPE_ICONS.AUTRE;
  
  // Générer les initiales
  const initials = `${collaborator.first_name?.charAt(0) || ''}${collaborator.last_name?.charAt(0) || ''}`.toUpperCase();
  
  // Tailles
  const sizeClasses = {
    sm: 'h-7 w-7 text-xs',
    md: 'h-9 w-9 text-sm',
    lg: 'h-12 w-12 text-base',
  };
  
  const isInactive = !!collaborator.leaving_date;

  return (
    <div className={cn('relative inline-flex', className)}>
      <div
        className={cn(
          'rounded-full flex items-center justify-center font-semibold ring-2 transition-all duration-200',
          sizeClasses[size],
          colors.bg,
          colors.text,
          colors.ring,
          isInactive && 'opacity-50 grayscale',
        )}
        title={`${collaborator.first_name} ${collaborator.last_name} (${type})`}
      >
        {initials || '?'}
      </div>
      
      {/* Badge type icon */}
      {showTypeIcon && (
        <span 
          className={cn(
            'absolute -bottom-0.5 -right-0.5 text-xs',
            size === 'sm' && 'text-[10px]',
            size === 'lg' && 'text-sm',
          )}
          title={type}
        >
          {typeIcon}
        </span>
      )}
      
      {/* Indicateur statut actif/inactif */}
      {!showTypeIcon && (
        <span 
          className={cn(
            'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background',
            isInactive ? 'bg-gray-400' : 'bg-green-500',
            size === 'sm' && 'w-2 h-2',
            size === 'lg' && 'w-3 h-3',
          )}
          title={isInactive ? 'Inactif' : 'Actif'}
        />
      )}
    </div>
  );
}

// Variante pour affichage dans la liste/tableau
export function RHCollaboratorAvatarCompact({
  collaborator,
  className,
}: {
  collaborator: RHCollaborator;
  className?: string;
}) {
  return (
    <RHCollaboratorAvatar
      collaborator={collaborator}
      size="sm"
      showTypeIcon={false}
      className={className}
    />
  );
}
