/**
 * ProfileMenu - Dropdown menu for user profile, appearance, and logout
 */
import { Link } from 'react-router-dom';
import { User, Building2, Settings, LogOut, Palette, Leaf, Droplets, Moon, Monitor, PanelTop, Columns } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { useAppTheme, type AppTheme } from '@/contexts/ThemeContext';

interface ProfileMenuProps {
  tabButtonClass: string;
}

const THEME_OPTIONS: { key: AppTheme; label: string; icon: React.ElementType }[] = [
  { key: 'default', label: 'Classique', icon: Monitor },
  { key: 'zen-nature', label: 'Zen Nature', icon: Leaf },
  { key: 'zen-blue', label: 'Zen Bleu', icon: Droplets },
  { key: 'sombre', label: 'Sombre', icon: Moon },
];

export function ProfileMenu({ tabButtonClass }: ProfileMenuProps) {
  const { user, logout } = useAuthCore();
  const { theme, setTheme } = useAppTheme();

  return (
    <div className="flex items-end gap-2 shrink-0">
      <div className="h-6 w-px bg-border/50 mb-2" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={tabButtonClass}
            data-state="inactive"
            aria-label="Profil"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shadow-sm transition-transform group-hover:scale-110 shrink-0">
                <User className="w-3.5 h-3.5 text-foreground" />
              </div>
              <span className="text-sm font-semibold tracking-tight">Profil</span>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-popover z-50">
          <div className="px-3 py-2">
            <p className="font-medium text-sm">{user?.email?.split('@')[0] || 'Utilisateur'}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
              <User className="w-4 h-4" />
              Mon profil
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/agence" className="flex items-center gap-2 cursor-pointer">
              <Building2 className="w-4 h-4" />
              Mon agence
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/changelog" className="flex items-center gap-2 cursor-pointer">
              <Settings className="w-4 h-4" />
              Changelog
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="flex items-center gap-2 cursor-pointer">
              <Palette className="w-4 h-4" />
              Apparence
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="w-48">
                {THEME_OPTIONS.map(opt => (
                  <DropdownMenuItem
                    key={opt.key}
                    onClick={() => setTheme(opt.key)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <opt.icon className="w-4 h-4" />
                    {opt.label}
                    {theme === opt.key && <span className="ml-auto w-2 h-2 rounded-full bg-primary" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={logout}
            className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
