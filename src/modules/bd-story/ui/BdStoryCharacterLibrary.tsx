/**
 * BdStoryCharacterLibrary — Visual character bible / admin panel
 * Shows all collaborators with their reference photos and visual identity
 */
import { BD_STORY_CHARACTERS } from '../data/characters';
import { cn } from '@/lib/utils';

// Static imports for character photos
import amandinePhoto from '@/assets/bd-story/characters/amandine.png';
import benjaminPhoto from '@/assets/bd-story/characters/benjamin.png';
import clemencePhoto from '@/assets/bd-story/characters/clemence.png';
import crisPhoto from '@/assets/bd-story/characters/cris.png';
import guillaumePhoto from '@/assets/bd-story/characters/guillaume.png';
import jeromePhoto from '@/assets/bd-story/characters/jerome.png';
import loicPhoto from '@/assets/bd-story/characters/loic.png';
import maximePhoto from '@/assets/bd-story/characters/maxime.png';
import pierreAntoinePhoto from '@/assets/bd-story/characters/pierre_antoine.png';
import sebastienPhoto from '@/assets/bd-story/characters/sebastien.png';
import yannickPhoto from '@/assets/bd-story/characters/yannick.png';
import yoannPhoto from '@/assets/bd-story/characters/yoann.png';

const PHOTO_MAP: Record<string, string> = {
  jerome: jeromePhoto,
  clemence: clemencePhoto,
  amandine: amandinePhoto,
  sebastien: sebastienPhoto,
  yoann: yoannPhoto,
  loic: loicPhoto,
  pierre_antoine: pierreAntoinePhoto,
  benjamin: benjaminPhoto,
  yannick: yannickPhoto,
  guillaume: guillaumePhoto,
  cris: crisPhoto,
  maxime: maximePhoto,
};

const ROLE_COLORS: Record<string, string> = {
  dirigeant: 'bg-amber-100 text-amber-700 border-amber-200',
  directrice: 'bg-purple-100 text-purple-700 border-purple-200',
  assistante: 'bg-green-100 text-green-700 border-green-200',
  commercial: 'bg-blue-100 text-blue-700 border-blue-200',
  technicien: 'bg-cyan-100 text-cyan-700 border-cyan-200',
};

interface Props {
  className?: string;
}

export function BdStoryCharacterLibrary({ className }: Props) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">👥 Bible visuelle des personnages</h3>
        <span className="text-xs text-muted-foreground">{BD_STORY_CHARACTERS.length} personnages</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {BD_STORY_CHARACTERS.filter(c => c.active).map((char) => {
          const photo = PHOTO_MAP[char.slug];
          return (
            <div 
              key={char.slug}
              className="rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Photo */}
              <div className="aspect-square bg-muted/20 relative overflow-hidden">
                {photo ? (
                  <img 
                    src={photo} 
                    alt={char.firstName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl text-muted-foreground/30">
                    👤
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">{char.firstName}</span>
                </div>
                
                <span className={cn(
                  'inline-block text-[9px] px-1.5 py-0.5 rounded-md border font-medium',
                  ROLE_COLORS[char.role] || 'bg-muted text-muted-foreground'
                )}>
                  {char.role}
                </span>

                {/* Specialties */}
                <div className="flex flex-wrap gap-1">
                  {char.specialties.slice(0, 3).map(s => (
                    <span key={s} className="text-[8px] px-1 py-0.5 rounded bg-muted/50 text-muted-foreground">
                      {s.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>

                {/* Visual traits */}
                <p className="text-[9px] text-muted-foreground/70 leading-tight line-clamp-2">
                  {char.visualIdentity.hair}, {char.visualIdentity.facialTraits.join(', ')}
                </p>

                {/* Rules */}
                {char.officeOnly && (
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-100">
                    Bureau uniquement
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Export photo map for use by render engine
 */
export { PHOTO_MAP };
