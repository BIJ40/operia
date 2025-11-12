import { Block } from '@/types/block';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Home } from 'lucide-react';

interface SidebarProps {
  blocks: Block[];
  currentBlockId?: string;
}

export function Sidebar({ blocks, currentBlockId }: SidebarProps) {
  const pinnedBlocks = blocks.filter(b => b.pinned && b.slug);

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 p-6 min-h-screen sticky top-0">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-blue-400 mb-1">Manuel CRM Apogee</h1>
        <p className="text-xs text-slate-400">Guide d'utilisation</p>
      </div>

      <nav className="space-y-1">
        <Link
          to="/"
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-slate-800 transition-colors"
        >
          <Home className="w-4 h-4" />
          Retour à l'index
        </Link>

        {pinnedBlocks.length > 0 && (
          <>
            <div className="pt-4 pb-2">
              <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Sections épinglées
              </h2>
            </div>
            {pinnedBlocks.map((block) => (
              <Link
                key={block.id}
                to={`/b/${block.slug}`}
                className={cn(
                  'block px-3 py-2 text-sm rounded-md hover:bg-slate-800 transition-colors',
                  currentBlockId === block.id && 'bg-slate-800 text-blue-400'
                )}
              >
                {block.title}
              </Link>
            ))}
          </>
        )}
      </nav>
    </aside>
  );
}
