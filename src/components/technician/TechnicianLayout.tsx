import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Calendar, Clock, FileText, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/t/planning', icon: Calendar, label: 'Planning' },
  { to: '/t/pointage', icon: Clock, label: 'Pointage' },
  { to: '/t/documents', icon: FileText, label: 'Documents' },
  { to: '/t/profil', icon: User, label: 'Profil' },
];

export function TechnicianLayout() {
  const location = useLocation();

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Main content */}
      <main className="flex-1 overflow-auto pb-16">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-area-pb">
        <div className="flex items-center justify-around h-16">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname.startsWith(to);
            return (
              <NavLink
                key={to}
                to={to}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors',
                  'min-w-[64px]',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className={cn('h-5 w-5', isActive && 'text-primary')} />
                <span className="text-xs font-medium">{label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
