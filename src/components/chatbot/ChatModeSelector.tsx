import { Button } from '@/components/ui/button';
import { UserCircle } from 'lucide-react';
import chatIcon from '@/assets/logo_chat.png';

interface ChatModeSelectorProps {
  isCreating: boolean;
  onSelectAI: () => void;
  onSelectSupport: () => void;
}

export function ChatModeSelector({
  isCreating,
  onSelectAI,
  onSelectSupport,
}: ChatModeSelectorProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 px-4 py-6">
      <div className="text-center mb-2">
        <h4 className="font-semibold text-base mb-1">Comment puis-je vous aider ?</h4>
        <p className="text-xs text-muted-foreground">Choisissez le type d'assistance</p>
      </div>

      <button
        onClick={onSelectAI}
        className="w-full group relative border-2 border-primary/30 bg-gradient-to-r from-helpconfort-blue-light/20 to-helpconfort-blue-dark/20 rounded-full px-4 py-3 hover:shadow-lg hover:border-primary/60 hover:scale-[1.03] transition-all duration-300 flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
          <img src={chatIcon} alt="IA" className="h-6 w-6" />
        </div>
        <div className="flex-1 text-left">
          <div className="font-bold text-sm text-foreground">Mme MICHU</div>
          <div className="text-xs text-muted-foreground">Intelligence artificielle</div>
        </div>
      </button>

      <button
        onClick={onSelectSupport}
        disabled={isCreating}
        className="w-full group relative border-2 border-primary/30 bg-gradient-to-r from-helpconfort-blue-light/20 to-helpconfort-blue-dark/20 rounded-full px-4 py-3 hover:shadow-lg hover:border-primary/60 hover:scale-[1.03] transition-all duration-300 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
          <UserCircle className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 text-left">
          <div className="font-bold text-sm text-foreground">
            {isCreating ? 'Connexion...' : 'Conseiller humain'}
          </div>
          <div className="text-xs text-muted-foreground">Support en direct</div>
        </div>
      </button>
    </div>
  );
}
