import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import type { SignatureConfig } from '@/hooks/useSignature';

interface Props { config: SignatureConfig; isActive: boolean; onClick: () => void; }

export function SignatureConfigCard({ config, isActive, onClick }: Props) {
  return (
    <button onClick={onClick} className={cn(
      "w-full text-left p-3 rounded-xl border transition-all",
      isActive ? "border-primary bg-primary/5 shadow-sm" : "border-border/50 hover:border-primary/30 hover:shadow-sm"
    )}>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg shrink-0" style={{ background: config.color_palette?.primary || '#1B3A5C' }} />
        <span className="text-sm font-medium truncate flex-1">{config.name}</span>
        {config.is_default && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />}
      </div>
      <div className="flex gap-1 mt-1.5 flex-wrap">
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{config.region}</Badge>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{config.style}</Badge>
        {config.auto_mode && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Auto</Badge>}
      </div>
    </button>
  );
}
