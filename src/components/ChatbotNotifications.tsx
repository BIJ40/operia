import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/contexts/PermissionsContext';
import { logError } from '@/lib/logger';

export function ChatbotNotifications() {
  const [pendingCount, setPendingCount] = useState(0);
  const navigate = useNavigate();
  const { hasGlobalRole } = useAuth();
  
  // P0: Remplacer isAdmin par hasGlobalRole (V2)
  const canViewNotifications = hasGlobalRole('platform_admin');

  useEffect(() => {
    if (!canViewNotifications) return;

    loadPendingCount();

    // S'abonner aux changements en temps réel
    const channel = supabase
      .channel('chatbot-queries-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chatbot_queries',
        },
        () => {
          loadPendingCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [canViewNotifications]);

  const loadPendingCount = async () => {
    try {
      const { count, error } = await supabase
        .from('chatbot_queries')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (error) throw error;
      setPendingCount(count || 0);
    } catch (error) {
      logError('CHATBOT', 'Erreur chargement compteur:', error);
    }
  };

  if (!canViewNotifications || pendingCount === 0) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={() => navigate('/admin/chatbot-queries')}
      title="Questions Mme MICHU en attente"
      aria-label="Questions Mme MICHU en attente"
    >
      <Bell className="h-5 w-5" />
      {pendingCount > 0 && (
        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center animate-pulse">
          {pendingCount > 9 ? '9+' : pendingCount}
        </span>
      )}
    </Button>
  );
}
