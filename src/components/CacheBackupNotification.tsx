import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BackupEvent {
  type: 'backup' | 'restore' | 'error';
  key: string;
  timestamp: number;
  message: string;
}

export function CacheBackupNotification() {
  const [events, setEvents] = useState<BackupEvent[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Écouter les événements de backup/restauration via console.log override
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    const interceptLog = (level: 'log' | 'warn' | 'error', args: any[]) => {
      const message = args.join(' ');
      
      // Détecter les événements de backup
      if (message.includes('💾 Backup sauvegardé:')) {
        const key = message.split('💾 Backup sauvegardé:')[1]?.split('(')[0]?.trim();
        if (key) {
          addEvent({ type: 'backup', key, timestamp: Date.now(), message: `Backup sauvegardé: ${key}` });
        }
      }
      
      // Détecter les restaurations
      if (message.includes('♻️ Backup restauré:') || message.includes('✅ Cache restauré et resauvegardé:')) {
        const key = message.split(/♻️ Backup restauré:|✅ Cache restauré et resauvegardé:/)[1]?.split('(')[0]?.trim();
        if (key) {
          addEvent({ type: 'restore', key, timestamp: Date.now(), message: `Cache restauré depuis backup: ${key}` });
          setVisible(true);
        }
      }
      
      // Détecter les erreurs
      if (message.includes('❌ Erreur backup') || message.includes('❌ Erreur restauration')) {
        const key = message.split('❌')[1]?.split(':')[0]?.trim() || 'Unknown';
        addEvent({ type: 'error', key, timestamp: Date.now(), message: `Erreur: ${message}` });
        setVisible(true);
      }
    };

    console.log = (...args: any[]) => {
      interceptLog('log', args);
      originalLog(...args);
    };

    console.warn = (...args: any[]) => {
      interceptLog('warn', args);
      originalWarn(...args);
    };

    console.error = (...args: any[]) => {
      interceptLog('error', args);
      originalError(...args);
    };

    // Nettoyer après 10 secondes
    const timer = setInterval(() => {
      setEvents(prev => {
        const now = Date.now();
        const filtered = prev.filter(e => now - e.timestamp < 10000);
        if (filtered.length === 0) {
          setVisible(false);
        }
        return filtered;
      });
    }, 1000);

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
      clearInterval(timer);
    };
  }, []);

  const addEvent = (event: BackupEvent) => {
    setEvents(prev => [...prev, event].slice(-5)); // Garder max 5 événements
  };

  if (!visible || events.length === 0) return null;

  const latestEvent = events[events.length - 1];

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md animate-in slide-in-from-bottom-5">
      <Alert variant={latestEvent.type === 'error' ? 'destructive' : 'default'}>
        {latestEvent.type === 'backup' && <CheckCircle className="h-4 w-4" />}
        {latestEvent.type === 'restore' && <Info className="h-4 w-4" />}
        {latestEvent.type === 'error' && <AlertCircle className="h-4 w-4" />}
        
        <AlertTitle>
          {latestEvent.type === 'backup' && 'Sauvegarde automatique'}
          {latestEvent.type === 'restore' && 'Restauration automatique'}
          {latestEvent.type === 'error' && 'Erreur backup'}
        </AlertTitle>
        
        <AlertDescription className="flex items-center justify-between">
          <span className="text-sm">{latestEvent.message}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setVisible(false)}
            className="ml-2"
          >
            Fermer
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}
