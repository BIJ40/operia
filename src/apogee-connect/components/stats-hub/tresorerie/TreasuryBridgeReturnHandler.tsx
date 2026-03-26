/**
 * TreasuryBridgeReturnHandler — Handles Bridge Connect callback on return
 * 
 * Uses bridge_connection_id from the callback URL for reliable correlation
 * instead of heuristic "most recent connecting" lookup.
 */

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProcessBridgeCallback, useSyncBankConnection } from '@/apogee-connect/hooks/useTreasury';
import { toast } from 'sonner';

const BRIDGE_PARAMS = ['bridge_callback', 'bridge_connection_id', 'success', 'item_id', 'step', 'source', 'context', 'user_uuid'] as const;

export function TreasuryBridgeReturnHandler() {
  const [searchParams, setSearchParams] = useSearchParams();
  const processCallback = useProcessBridgeCallback();
  const syncConnection = useSyncBankConnection();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    
    const isBridgeCallback = searchParams.get('bridge_callback') === '1';
    if (!isBridgeCallback) return;

    // Reliable correlation: use the connectionId injected into callback URL
    const connectionId = searchParams.get('bridge_connection_id');
    if (!connectionId) {
      console.error('[BRIDGE_CALLBACK] Missing bridge_connection_id — cannot correlate');
      toast.error('Retour Bridge incomplet : identifiant de connexion manquant.');
      cleanUrlParams();
      return;
    }

    processed.current = true;

    // Extract real Bridge callback params
    const successParam = searchParams.get('success');
    const bridgeParams = {
      connectionId,
      // Explicit: only true if success=true, never assume success
      success: successParam === 'true' ? true : successParam === 'false' ? false : undefined,
      item_id: searchParams.get('item_id') ?? undefined,
      step: searchParams.get('step') ?? undefined,
      source: searchParams.get('source') ?? undefined,
      context: searchParams.get('context') ?? undefined,
      user_uuid: searchParams.get('user_uuid') ?? undefined,
    };

    (async () => {
      try {
        toast.info('Finalisation de la connexion bancaire...');

        const callbackResult = await processCallback.mutateAsync(bridgeParams);
        const resultData = callbackResult as unknown as { data?: { needsSync?: boolean; status?: string } };
        const needsSync = resultData?.data?.needsSync === true;

        if (needsSync) {
          toast.info('Synchronisation des comptes en cours...');
          await syncConnection.mutateAsync(connectionId);
          toast.success('Connexion bancaire établie et comptes synchronisés !');
        } else {
          const status = resultData?.data?.status;
          if (status === 'error') {
            toast.error('La connexion bancaire a échoué. Veuillez réessayer.');
          } else if (bridgeParams.success === undefined) {
            // Ambiguous — no explicit success from Bridge
            toast.warning('Retour Bridge ambigu. Vérifiez l\'état de votre connexion.');
          } else {
            toast.success('Retour de Bridge traité.');
          }
        }
      } catch (err) {
        console.error('[BRIDGE_CALLBACK_PROCESS_ERROR]', err);
        toast.error('Erreur lors du traitement du retour Bridge.');
      }

      cleanUrlParams();
    })();

    function cleanUrlParams() {
      const newParams = new URLSearchParams(searchParams);
      BRIDGE_PARAMS.forEach(p => newParams.delete(p));
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams]);

  return null;
}
