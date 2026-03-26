/**
 * TreasuryBridgeReturnHandler — Handles Bridge Connect callback on return
 * 
 * Bridge callback_url returns with query params: user_uuid, item_id, success, step, source, context.
 * This component detects the callback and processes the return via edge function.
 */

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProcessBridgeCallback, useSyncBankConnection, useBankConnections } from '@/apogee-connect/hooks/useTreasury';
import { toast } from 'sonner';

export function TreasuryBridgeReturnHandler() {
  const [searchParams, setSearchParams] = useSearchParams();
  const processCallback = useProcessBridgeCallback();
  const syncConnection = useSyncBankConnection();
  const { data: connections } = useBankConnections();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    
    const isBridgeCallback = searchParams.get('bridge_callback') === '1';
    if (!isBridgeCallback) return;

    // Find the most recent "connecting" or "pending" connection
    const connectingConn = connections?.find(c => c.status === 'connecting' || c.status === 'pending');
    if (!connectingConn) return;

    processed.current = true;

    // Extract real Bridge callback params from URL
    const bridgeParams = {
      connectionId: connectingConn.id,
      success: searchParams.get('success') === 'true' || searchParams.get('success') === null, // default true if not present
      item_id: searchParams.get('item_id') ?? undefined,
      step: searchParams.get('step') ?? undefined,
      source: searchParams.get('source') ?? undefined,
      context: searchParams.get('context') ?? undefined,
      user_uuid: searchParams.get('user_uuid') ?? undefined,
    };

    (async () => {
      try {
        toast.info('Finalisation de la connexion bancaire...');

        // 1. Process callback with real Bridge params
        const callbackResult = await processCallback.mutateAsync(bridgeParams);

        const resultData = callbackResult as unknown as { data?: { needsSync?: boolean; status?: string } };
        const needsSync = resultData?.data?.needsSync ?? bridgeParams.success;

        if (needsSync) {
          // 2. Trigger initial sync
          toast.info('Synchronisation des comptes en cours...');
          await syncConnection.mutateAsync(connectingConn.id);
          toast.success('Connexion bancaire établie et comptes synchronisés !');
        } else {
          const status = resultData?.data?.status;
          if (status === 'error') {
            toast.error('La connexion bancaire a échoué. Veuillez réessayer.');
          } else {
            toast.success('Retour de Bridge traité.');
          }
        }
      } catch (err) {
        console.error('[BRIDGE_CALLBACK_PROCESS_ERROR]', err);
        toast.error('Erreur lors du traitement du retour Bridge.');
      }

      // Clean URL params
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('bridge_callback');
      newParams.delete('success');
      newParams.delete('item_id');
      newParams.delete('step');
      newParams.delete('source');
      newParams.delete('context');
      newParams.delete('user_uuid');
      setSearchParams(newParams, { replace: true });
    })();
  }, [connections, searchParams]);

  return null;
}
