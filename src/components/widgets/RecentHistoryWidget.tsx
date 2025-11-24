import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Clock, ExternalLink } from 'lucide-react';
import { DashboardWidget } from './DashboardWidget';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface HistoryItem {
  id: string;
  block_title: string;
  block_slug: string;
  category_slug: string;
  scope: string;
  visited_at: string;
}

interface RecentHistoryWidgetProps {
  size?: 'small' | 'medium' | 'large';
  isConfigMode?: boolean;
  onRemove?: () => void;
}

export function RecentHistoryWidget({ size = 'medium', isConfigMode, onRemove }: RecentHistoryWidgetProps) {
  const { user } = useAuth();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user]);

  const loadHistory = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_history')
        .select('*')
        .eq('user_id', user.id)
        .order('visited_at', { ascending: false })
        .limit(5);

      if (!error && data) {
        setHistory(data);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScopeUrl = (item: HistoryItem) => {
    if (item.scope === 'apporteur') {
      return `/apporteurs/category/${item.category_slug}`;
    } else if (item.scope === 'helpconfort') {
      return `/helpconfort/category/${item.category_slug}`;
    }
    return `/apogee/category/${item.category_slug}`;
  };

  return (
    <DashboardWidget
      title="Dernières consultations"
      description="Vos pages récemment visitées"
      size={size}
      isConfigMode={isConfigMode}
      onRemove={onRemove}
    >
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
          <Clock className="h-8 w-8 mb-2 opacity-50" />
          <p className="text-sm">Aucun historique pour le moment</p>
        </div>
      ) : (
        <div className="space-y-2">
          {history.map((item) => (
            <Link
              key={item.id}
              to={getScopeUrl(item)}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.block_title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(item.visited_at), { 
                    addSuffix: true,
                    locale: fr 
                  })}
                </p>
              </div>
              <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
            </Link>
          ))}
        </div>
      )}
    </DashboardWidget>
  );
}
