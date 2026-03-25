/**
 * Forecast UI — Horizon management hook
 * Phase 6B Lot 6.1
 */

import { useState, useMemo, useCallback } from 'react';
import type { ForecastHorizon } from '../types';
import { horizonToDays } from '../types';

const HORIZON_LABELS: Record<ForecastHorizon, string> = {
  '7d': 'J+7',
  '14d': 'J+14',
  '30d': 'J+30',
};

const STORAGE_KEY = 'forecast-horizon';

function loadSavedHorizon(): ForecastHorizon {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === '7d' || saved === '14d' || saved === '30d') return saved;
  } catch {}
  return '7d';
}

export function useForecastHorizon() {
  const [horizon, setHorizonState] = useState<ForecastHorizon>(loadSavedHorizon);

  const setHorizon = useCallback((h: ForecastHorizon) => {
    setHorizonState(h);
    try { localStorage.setItem(STORAGE_KEY, h); } catch {}
  }, []);

  const period = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + horizonToDays(horizon));
    return { start, end };
  }, [horizon]);

  const label = HORIZON_LABELS[horizon];

  return { horizon, setHorizon, period, label };
}
