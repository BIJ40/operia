import { BookOpen, Users, Building2, HelpCircle } from 'lucide-react';
import { ChatContext } from './ChatContextSelector';

interface ChatModeSelectorProps {
  isCreating: boolean;
  onSelectTheme: (theme: ChatContext) => void;
}

const themes = [
  { 
    id: 'apogee' as ChatContext, 
    label: 'Apogée', 
    description: 'Logiciel métier',
    icon: BookOpen,
    gradient: 'from-blue-500/20 to-blue-600/20',
    borderColor: 'border-blue-500/30 hover:border-blue-500/60'
  },
  { 
    id: 'apporteurs' as ChatContext, 
    label: 'Apporteurs', 
    description: 'Gestion partenaires',
    icon: Users,
    gradient: 'from-green-500/20 to-green-600/20',
    borderColor: 'border-green-500/30 hover:border-green-500/60'
  },
  { 
    id: 'helpconfort' as ChatContext, 
    label: 'HelpConfort', 
    description: 'Services & process',
    icon: Building2,
    gradient: 'from-purple-500/20 to-purple-600/20',
    borderColor: 'border-purple-500/30 hover:border-purple-500/60'
  },
  { 
    id: 'autre' as ChatContext, 
    label: 'Autre', 
    description: 'Question générale',
    icon: HelpCircle,
    gradient: 'from-gray-500/20 to-gray-600/20',
    borderColor: 'border-gray-500/30 hover:border-gray-500/60'
  },
];

export function ChatModeSelector({
  isCreating,
  onSelectTheme,
}: ChatModeSelectorProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 px-4 py-6">
      <div className="text-center mb-2">
        <h4 className="font-semibold text-base mb-1">Votre demande concerne :</h4>
        <p className="text-xs text-muted-foreground">Sélectionnez un thème pour commencer</p>
      </div>

      <div className="w-full space-y-2">
        {themes.map((theme) => {
          const Icon = theme.icon;
          return (
            <button
              key={theme.id}
              onClick={() => onSelectTheme(theme.id)}
              disabled={isCreating}
              className={`w-full group relative border-2 ${theme.borderColor} bg-gradient-to-r ${theme.gradient} rounded-full px-4 py-3 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="w-9 h-9 rounded-full bg-background/50 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <Icon className="h-5 w-5 text-foreground" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-bold text-sm text-foreground">{theme.label}</div>
                <div className="text-xs text-muted-foreground">{theme.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
