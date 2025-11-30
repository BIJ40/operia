/**
 * Composant d'affichage d'un message de ticket
 * Phase 3 - UI : Distinction messages utilisateur / support / notes internes
 */

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Lock, User, Headphones, Info } from 'lucide-react';

interface TicketMessageItemProps {
  message: {
    id: string;
    message: string;
    is_from_support: boolean;
    is_internal_note?: boolean;
    is_system_message?: boolean;
    created_at: string;
    sender_id: string;
  };
  isCurrentUserMessage?: boolean;
}

export function TicketMessageItem({ message, isCurrentUserMessage }: TicketMessageItemProps) {
  const isInternalNote = message.is_internal_note === true;
  const isSystemMessage = message.is_system_message === true;
  const isFromSupport = message.is_from_support;

  // SUPPORT_V2: Messages système centrés avec style distinct
  if (isSystemMessage) {
    return (
      <div className="flex justify-center my-2">
        <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full text-xs border border-blue-200 dark:border-blue-800">
          <Info className="w-3 h-3" />
          <span>{message.message}</span>
        </div>
      </div>
    );
  }

  // Style différent selon le type de message
  const getMessageStyle = () => {
    if (isInternalNote) {
      // Note interne : fond ambré, bordure pointillée
      return 'bg-amber-50 border-amber-300 border-dashed dark:bg-amber-950/30 dark:border-amber-700';
    }
    if (isFromSupport) {
      // Message support : aligné à droite, fond primaire
      return 'bg-primary text-primary-foreground ml-auto';
    }
    // Message utilisateur : aligné à gauche, fond muted
    return 'bg-muted';
  };

  const getAlignment = () => {
    if (isInternalNote) return 'justify-start';
    return isFromSupport ? 'justify-end' : 'justify-start';
  };

  return (
    <div className={`flex ${getAlignment()}`}>
      <div
        className={`max-w-[80%] rounded-lg p-3 border ${getMessageStyle()} ${
          isInternalNote ? 'w-full max-w-full' : ''
        }`}
      >
        {/* En-tête du message */}
        <div className="flex items-center gap-2 mb-1">
          {isInternalNote ? (
            <>
              <Lock className="w-3 h-3 text-amber-600" />
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                Note interne
              </span>
            </>
          ) : isFromSupport ? (
            <>
              <Headphones className="w-3 h-3" />
              <span className="text-xs font-medium opacity-80">Support</span>
            </>
          ) : (
            <>
              <User className="w-3 h-3" />
              <span className="text-xs font-medium opacity-80">Utilisateur</span>
            </>
          )}
        </div>

        {/* Contenu du message */}
        <p className={`text-sm whitespace-pre-wrap ${isInternalNote ? 'text-amber-900 dark:text-amber-100' : ''}`}>
          {message.message}
        </p>

        {/* Horodatage */}
        <p className={`text-xs mt-1 ${isInternalNote ? 'text-amber-600' : 'opacity-70'}`}>
          {format(new Date(message.created_at), 'HH:mm', { locale: fr })}
        </p>
      </div>
    </div>
  );
}
