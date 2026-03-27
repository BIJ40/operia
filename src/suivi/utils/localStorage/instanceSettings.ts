/**
 * Instance settings utilities
 */

/**
 * Load the setting for processing avoirs
 * @returns Boolean indicating whether avoirs should be processed
 */
export function loadProcessAvoirs(): boolean {
  try {
    const setting = localStorage.getItem('process_avoirs');
    return setting === null ? true : setting === 'true'; // Default to true if not set
  } catch (error) {
    console.error('Error loading process avoirs setting:', error);
    return true; // Default to processing avoirs if there's an error
  }
}

/**
 * Save the setting for processing avoirs
 * @param value Boolean indicating whether avoirs should be processed
 */
export function saveProcessAvoirs(value: boolean): void {
  try {
    localStorage.setItem('process_avoirs', value.toString());
  } catch (error) {
    console.error('Error saving process avoirs setting:', error);
  }
}

/**
 * Load instance name from localStorage
 * @returns Instance name string
 */
export function loadInstanceName(): string {
  try {
    const name = localStorage.getItem('instance_name');
    return name || ''; // Default to empty string if not set
  } catch (error) {
    console.error('Error loading instance name:', error);
    return '';
  }
}

/**
 * Save instance name to localStorage
 * @param name Instance name
 */
export function saveInstanceName(name: string): void {
  try {
    localStorage.setItem('instance_name', name);
  } catch (error) {
    console.error('Error saving instance name:', error);
  }
}

/**
 * Load API path from localStorage
 * @returns API path string
 */
export function loadApiPath(): string {
  try {
    const path = localStorage.getItem('api_path');
    return path || 'hc2'; // Default API path if not set
  } catch (error) {
    console.error('Error loading API path:', error);
    return 'hc2';
  }
}

/**
 * Save API path to localStorage
 * @param path API path
 */
export function saveApiPath(path: string): void {
  try {
    localStorage.setItem('api_path', path);
  } catch (error) {
    console.error('Error saving API path:', error);
  }
}

/**
 * Get base URL for API calls
 * @returns Complete base URL for API
 */
export function getBaseUrl(): string {
  return 'https://dax.hc-apogee.fr/api/';
}

/**
 * Get storage prefix for instance-specific data
 * @returns Prefix string for localStorage keys
 */
export function getStoragePrefix(): string {
  const apiPath = loadApiPath();
  const instanceName = loadInstanceName();
  const prefix = `${apiPath}_${instanceName}_`.toLowerCase();
  
  // Use a sanitized prefix to avoid issues with special characters
  return prefix.replace(/[^a-z0-9_]/g, '_');
}

/**
 * Reset all instance data in localStorage
 * This removes all data specific to the current instance
 */
export function resetInstanceData(): void {
  try {
    const prefix = getStoragePrefix();
    
    // Get all localStorage keys
    const keys = Object.keys(localStorage);
    
    // Remove all keys that start with the current instance prefix
    keys.forEach(key => {
      if (key.startsWith(prefix)) {
        localStorage.removeItem(key);
      }
    });
    
    console.log('Instance data reset successfully');
  } catch (error) {
    console.error('Error resetting instance data:', error);
  }
}
