/**
 * Sync Engine Hook
 * Handles offline/online synchronization for the technician PWA
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  technicianDB,
  getPendingOutboxItems,
  updateOutboxStatus,
  getOutboxStats,
  type OutboxEntry,
} from '@/lib/offline/db';
import { useToast } from '@/hooks/use-toast';

// ============================================
// Types
// ============================================

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  errorCount: number;
  lastSyncAt: Date | null;
  lastError: string | null;
}

export interface SyncEngineOptions {
  /** Sync interval in ms when online (default: 30000 = 30s) */
  syncInterval?: number;
  /** Max retries before giving up on an item (default: 5) */
  maxRetries?: number;
  /** Enable auto-sync on online event (default: true) */
  autoSyncOnOnline?: boolean;
}

// ============================================
// Hook
// ============================================

export function useSyncEngine(options: SyncEngineOptions = {}) {
  const {
    syncInterval = 30000,
    maxRetries = 5,
    autoSyncOnOnline = true,
  } = options;

  const { toast } = useToast();
  const syncInProgressRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [status, setStatus] = useState<SyncStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
    errorCount: 0,
    lastSyncAt: null,
    lastError: null,
  });

  // ============================================
  // Update stats from IndexedDB
  // ============================================
  const refreshStats = useCallback(async () => {
    try {
      const stats = await getOutboxStats();
      setStatus((prev) => ({
        ...prev,
        pendingCount: stats.pending + stats.syncing,
        errorCount: stats.error,
      }));
    } catch (error) {
      console.error('[SyncEngine] Failed to refresh stats:', error);
    }
  }, []);

  // ============================================
  // Process a single outbox item
  // ============================================
  const processOutboxItem = useCallback(
    async (item: OutboxEntry): Promise<boolean> => {
      console.log(`[SyncEngine] Processing item ${item.id} (${item.op_type})`);

      try {
        // Mark as syncing
        await updateOutboxStatus(item.id, 'syncing');

        switch (item.op_type) {
          case 'SUBMIT_FLOW': {
            // Call edge function or insert into Supabase
            const { error } = await supabase.functions.invoke('submit-flow-result', {
              body: {
                client_operation_id: item.client_operation_id,
                rdv_id: item.rdv_id,
                payload: item.payload_json,
              },
            });

            if (error) throw error;
            break;
          }

          case 'UPLOAD_FILE': {
            // Handle file upload
            const { file_path, file_data, bucket } = item.payload_json as {
              file_path: string;
              file_data: string; // base64
              bucket: string;
            };

            // Convert base64 to blob
            const byteCharacters = atob(file_data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray]);

            const { error } = await supabase.storage
              .from(bucket)
              .upload(file_path, blob, { upsert: true });

            if (error) throw error;
            break;
          }

          default:
            throw new Error(`Unknown operation type: ${item.op_type}`);
        }

        // Mark as done
        await updateOutboxStatus(item.id, 'done');
        console.log(`[SyncEngine] Item ${item.id} synced successfully`);
        return true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[SyncEngine] Item ${item.id} failed:`, errorMessage);

        // Check retry count
        if (item.retry_count >= maxRetries - 1) {
          // Mark as permanent error after max retries
          await updateOutboxStatus(item.id, 'error', `Max retries exceeded: ${errorMessage}`);
        } else {
          // Mark as error for retry
          await updateOutboxStatus(item.id, 'error', errorMessage);
        }

        return false;
      }
    },
    [maxRetries]
  );

  // ============================================
  // Main sync function
  // ============================================
  const sync = useCallback(async () => {
    // Prevent concurrent syncs
    if (syncInProgressRef.current) {
      console.log('[SyncEngine] Sync already in progress, skipping');
      return;
    }

    // Check if online
    if (!navigator.onLine) {
      console.log('[SyncEngine] Offline, skipping sync');
      return;
    }

    // Check Supabase session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log('[SyncEngine] No session, skipping sync');
      return;
    }

    syncInProgressRef.current = true;
    setStatus((prev) => ({ ...prev, isSyncing: true }));

    try {
      console.log('[SyncEngine] Starting sync...');
      const items = await getPendingOutboxItems();

      if (items.length === 0) {
        console.log('[SyncEngine] No items to sync');
        setStatus((prev) => ({
          ...prev,
          isSyncing: false,
          lastSyncAt: new Date(),
          lastError: null,
        }));
        return;
      }

      console.log(`[SyncEngine] Found ${items.length} items to sync`);

      let successCount = 0;
      let errorCount = 0;

      // Process items sequentially (FIFO)
      for (const item of items) {
        // Skip items that have exceeded max retries
        if (item.retry_count >= maxRetries) {
          errorCount++;
          continue;
        }

        const success = await processOutboxItem(item);
        if (success) {
          successCount++;
        } else {
          errorCount++;
        }

        // Small delay between items
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      console.log(`[SyncEngine] Sync complete: ${successCount} success, ${errorCount} errors`);

      // Refresh stats
      await refreshStats();

      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
        lastSyncAt: new Date(),
        lastError: errorCount > 0 ? `${errorCount} élément(s) en erreur` : null,
      }));

      if (successCount > 0) {
        toast({
          title: 'Synchronisation terminée',
          description: `${successCount} élément(s) synchronisé(s)`,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('[SyncEngine] Sync failed:', errorMessage);

      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
        lastError: errorMessage,
      }));

      toast({
        title: 'Erreur de synchronisation',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      syncInProgressRef.current = false;
    }
  }, [processOutboxItem, refreshStats, maxRetries, toast]);

  // ============================================
  // Online/Offline event handlers
  // ============================================
  useEffect(() => {
    const handleOnline = () => {
      console.log('[SyncEngine] Online detected');
      setStatus((prev) => ({ ...prev, isOnline: true }));

      if (autoSyncOnOnline) {
        // Delay sync slightly to ensure network is stable
        setTimeout(sync, 1000);
      }
    };

    const handleOffline = () => {
      console.log('[SyncEngine] Offline detected');
      setStatus((prev) => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [autoSyncOnOnline, sync]);

  // ============================================
  // Periodic sync interval
  // ============================================
  useEffect(() => {
    if (syncInterval > 0) {
      intervalRef.current = setInterval(() => {
        if (navigator.onLine) {
          sync();
        }
      }, syncInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [syncInterval, sync]);

  // ============================================
  // Initial stats load
  // ============================================
  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  // ============================================
  // Manual retry for error items
  // ============================================
  const retryErrors = useCallback(async () => {
    const errorItems = await technicianDB.outbox
      .where('status')
      .equals('error')
      .toArray();

    // Reset retry count for manual retry
    for (const item of errorItems) {
      await technicianDB.outbox.update(item.id, {
        status: 'pending',
        retry_count: 0,
        updated_at: Date.now(),
      });
    }

    await refreshStats();
    await sync();
  }, [refreshStats, sync]);

  // ============================================
  // Clear completed items
  // ============================================
  const clearCompleted = useCallback(async () => {
    await technicianDB.outbox.where('status').equals('done').delete();
    await refreshStats();
  }, [refreshStats]);

  return {
    status,
    sync,
    retryErrors,
    clearCompleted,
    refreshStats,
  };
}
