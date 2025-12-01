import { forwardRef } from 'react';
import { MessageCircle } from 'lucide-react';

interface ChatButtonProps {
  position: { right: number; bottom: number };
  unreadCount: number;
  onMouseDown: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export const ChatButton = forwardRef<HTMLButtonElement, ChatButtonProps>(
  ({ position, unreadCount, onMouseDown, onClick }, ref) => {
    return (
      <button
        ref={ref}
        onMouseDown={onMouseDown}
        onClick={onClick}
        data-chatbot-trigger
        style={{
          position: 'fixed',
          bottom: `${position.bottom}px`,
          right: `${position.right}px`,
          zIndex: 9999,
        }}
        className="relative px-6 py-3 rounded-full shadow-2xl hover:shadow-[0_20px_50px_rgba(8,_112,_184,_0.7)] hover:scale-105 hover:-translate-y-1 transition-all duration-300 overflow-visible bg-gradient-to-r from-helpconfort-blue-light to-helpconfort-blue-dark group flex items-center gap-3 before:absolute before:inset-0 before:rounded-full before:bg-white/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300"
      >
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-full cursor-grab group-hover:opacity-100 opacity-0 transition-opacity pointer-events-none">
          <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1 h-6 bg-white/50 rounded-full"></div>
        </div>

        <MessageCircle className="h-6 w-6 text-white flex-shrink-0 group-hover:rotate-12 transition-transform duration-300" />
        <span className="text-white font-semibold text-sm whitespace-nowrap relative z-10">
          Demander de l'aide en direct
        </span>

        {unreadCount > 0 && (
          <div className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center animate-pulse shadow-lg border-2 border-background pointer-events-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>
    );
  }
);

ChatButton.displayName = 'ChatButton';
