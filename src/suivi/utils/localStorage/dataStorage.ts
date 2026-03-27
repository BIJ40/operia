/**
 * General data storage utilities
 */

import { loadData, saveData } from './core';

export function storeData<T>(key: string, data: T): void {
  saveData(key, data);
}

export function retrieveData<T>(key: string, defaultValue: T): T {
  return loadData(key) ?? defaultValue;
}

export function storeWithTimestamp<T>(key: string, data: T): void {
  const dataWithTimestamp = {
    data,
    timestamp: Date.now(),
  };
  saveData(key, dataWithTimestamp);
}

export function retrieveWithTimestamp<T>(
  key: string,
  maxAge?: number
): T | null {
  const stored = loadData(key) as { data: T; timestamp: number } | undefined;
  
  if (!stored) return null;
  
  if (maxAge && Date.now() - stored.timestamp > maxAge) {
    return null;
  }
  
  return stored.data;
}
