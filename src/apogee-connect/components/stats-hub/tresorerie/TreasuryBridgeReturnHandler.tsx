/**
 * TreasuryBridgeReturnHandler — Handles Bridge Connect callback on return
 * 
 * When the user returns from Bridge Connect, URL params contain callback info.
 * This component detects bridge_callback=1 and processes the return.
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

    // Find the most recent "connecting" connection to process
    const connectingConn = connections?.find(c => c.status === 'connecting' || c.status === 'pending');
    if (!connectingConn) return;

    processed.current = true;

    // Bridge doesn't pass detailed status in redirect URL by default,
    // so we assume success and let the sync determine the real state
    const bridgeStatus = searchParams.get('bridge_status') ?? 'success';

    (async () => {
      try {
        toast.info('Finalisation de la connexion bancaire...');

        // 1. Process callback
        const callbackResult = await processCallback.mutateAsync({
          connectionId: connectingConn.id,
          bridgeStatus,
        });

        const resultData = callbackResult as unknown as { data?: { needsSync?: boolean; status?: string } };
        const needsSync = resultData?.data?.needsSync ?? bridgeStatus === 'success';

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
      newParams.delete('bridge_status');
      setSearchParams(newParams, { replace: true });
    })();
  }, [connections, searchParams]);

  return null;
}
