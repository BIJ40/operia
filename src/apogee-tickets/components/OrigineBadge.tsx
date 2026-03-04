/**
 * Badge Origine en lecture seule
 * Affiche l'origine du ticket dans un format ovale/arrondi
 */

import { User, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
interface OrigineBadgeProps {
  origine: string | null | undefined;
  size?: 'sm' | 'default';
}

const ORIGINE_CONFIG: Record<string, { label: string; color: string; textColor: string }> = {
  JEROME: { label: 'Jérôme', color: 'hsl(217, 91%, 60%)', textColor: 'white' },
  FLORIAN: { label: 'Florian', color: 'hsl(142, 76%, 36%)', textColor: 'white' },
  ERIC: { label: 'Éric', color: 'hsl(25, 95%, 53%)', textColor: 'white' },
  MARIE: { label: 'Marie', color: 'hsl(330, 81%, 60%)', textColor: 'white' },
  MATHILDE: { label: 'Mathilde', color: 'hsl(271, 81%, 56%)', textColor: 'white' },
  APOGEE: { label: 'Apogée', color: 'hsl(258, 90%, 66%)', textColor: 'white' },
  HUGO: { label: 'Hugo', color: 'hsl(239, 84%, 67%)', textColor: 'white' },
  AUTRE: { label: 'Autre', color: 'hsl(220, 9%, 46%)', textColor: 'white' },
  MAIL: { label: 'Email', color: 'hsl(174, 72%, 40%)', textColor: 'white' },
  AGENCE: { label: 'Agence', color: 'hsl(200, 70%, 50%)', textColor: 'white' },
};

// Génère une couleur stable à partir d'un string (pour noms/emails non prédéfinis)
function stringToHue(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

function isEmail(str: string): boolean {
  return str.includes('@');
}

// Formate un nom "PRENOM NOM" → "Prénom N."
function formatName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return name;
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
  }
  const firstName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase() + '.';
  return `${firstName} ${lastInitial}`;
}

export function OrigineBadge({ origine, size = 'sm' }: OrigineBadgeProps) {
  if (!origine) {
    return null;
  }

  const normalizedOrigine = origine.toUpperCase();
  const knownConfig = ORIGINE_CONFIG[normalizedOrigine];
  
  // Determine display label, color, and icon
  let label: string;
  let color: string;
  let textColor = 'white';
  let showMailIcon = false;

  if (knownConfig) {
    label = knownConfig.label;
    color = knownConfig.color;
    showMailIcon = normalizedOrigine === 'MAIL';
  } else if (isEmail(origine)) {
    // Email non matché : afficher l'email
    label = origine.toLowerCase();
    color = 'hsl(174, 72%, 40%)';
    showMailIcon = true;
  } else {
    // Nom complet (ex: "VALENTIN DUPONT") : formater et générer couleur
    label = formatName(origine);
    const hue = stringToHue(normalizedOrigine);
    color = `hsl(${hue}, 65%, 45%)`;
  }

  const sizeClasses = size === 'sm' 
    ? 'text-xs px-2 py-0.5' 
    : 'text-sm px-3 py-1';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-full shadow-sm',
        sizeClasses
      )}
      style={{ 
        backgroundColor: color, 
        color: textColor,
      }}
    >
      {showMailIcon ? (
        <Mail className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      ) : (
        <User className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      )}
      <span>{label}</span>
    </span>
  );
}
