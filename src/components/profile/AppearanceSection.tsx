import { useAppTheme, type AppTheme } from '@/contexts/ThemeContext';
import { WarmCard } from '@/components/ui/warm-card';
import { Palette, Leaf, Droplets, Moon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThemeOption {
  key: AppTheme;
  label: string;
  description: string;
  icon: typeof Leaf;
  colors: string[]; // preview swatches (raw hex)
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    key: 'default',
    label: 'Classique',
    description: 'Thème HelpConfort par défaut — bleu et orange',
    icon: Monitor,
    colors: ['#0092dd', '#ffb705', '#F4F6F8', '#ffffff'],
  },
  {
    key: 'zen-nature',
    label: 'Zen Nature',
    description: 'Beige sable, vert sauge, tons chauds — inspiré wabi-sabi',
    icon: Leaf,
    colors: ['#A8BFA0', '#E6D5B8', '#F5EFE6', '#C8D6C5'],
  },
  {
    key: 'zen-blue',
    label: 'Zen Bleu',
    description: 'Bleu poudre, ciel doux, sérénité — calme professionnel',
    icon: Droplets,
    colors: ['#AFCDE7', '#BFD7EA', '#D6E6F2', '#9FB6C8'],
  },
  {
    key: 'sombre',
    label: 'Sombre',
    description: 'Gris profond élégant — confort visuel, pas noir',
    icon: Moon,
    colors: ['#3a3d44', '#4a4d55', '#5a5d65', '#2a2d35'],
  },
];

export function AppearanceSection() {
  const { theme, setTheme } = useAppTheme();

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-warm-purple/80 to-warm-pink/60 flex items-center justify-center shadow-sm">
          <Palette className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Apparence</h2>
          <p className="text-sm text-muted-foreground">Choisissez l'ambiance visuelle de votre espace</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {THEME_OPTIONS.map((opt) => {
          const isActive = theme === opt.key;
          const Icon = opt.icon;

          return (
            <button
              key={opt.key}
              onClick={() => setTheme(opt.key)}
              className={cn(
                'relative rounded-2xl p-5 text-left transition-all duration-300 border-2 group',
                'hover:shadow-lg hover:-translate-y-0.5',
                isActive
                  ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20'
                  : 'border-border bg-card hover:border-primary/30'
              )}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-primary animate-pulse" />
              )}

              <div className="flex items-start gap-4">
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                  isActive ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                )}>
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground mb-1">{opt.label}</div>
                  <div className="text-xs text-muted-foreground leading-relaxed">{opt.description}</div>

                  {/* Color swatches */}
                  <div className="flex gap-1.5 mt-3">
                    {opt.colors.map((color, i) => (
                      <div
                        key={i}
                        className="w-6 h-6 rounded-lg border border-black/10 shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
