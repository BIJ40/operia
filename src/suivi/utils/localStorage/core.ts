/**
 * Core localStorage utility functions
 */
import { getStoragePrefix } from './instanceSettings';

/**
 * Load data from localStorage
 * @param key Key to load from localStorage
 * @returns Data from localStorage
 */
export const loadData = (key: string) => {
  try {
    // Apply the instance prefix to the key
    const prefixedKey = getStoragePrefix() + key;
    const serializedData = localStorage.getItem(prefixedKey);
    if (serializedData === null) {
      return undefined;
    }
    return JSON.parse(serializedData);
  } catch (error) {
    console.error(`Failed to load ${key} from localStorage`, error);
    return undefined;
  }
};

/**
 * Save data to localStorage
 * @param key Key to save to localStorage
 * @param data Data to save to localStorage
 */
export const saveData = (key: string, data: any) => {
  try {
    // Apply the instance prefix to the key
    const prefixedKey = getStoragePrefix() + key;
    const serializedData = JSON.stringify(data);
    localStorage.setItem(prefixedKey, serializedData);
  } catch (error) {
    console.error(`Failed to save ${key} to localStorage`, error);
  }
};

/**
 * Remove data from localStorage
 * @param key Key to remove from localStorage
 */
export const removeData = (key: string) => {
  try {
    // Apply the instance prefix to the key
    const prefixedKey = getStoragePrefix() + key;
    localStorage.removeItem(prefixedKey);
  } catch (error) {
    console.error(`Failed to remove ${key} from localStorage`, error);
  }
};
