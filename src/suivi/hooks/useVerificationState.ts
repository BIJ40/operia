import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const STORAGE_KEY_PREFIX = 'suivi_verified_';
const EXPIRATION_HOURS = 24;

interface StoredVerification {
  code: string;
  expiresAt: number;
}

export function useVerificationState() {
  const { ref, agencySlug } = useParams<{ ref?: string; agencySlug?: string }>();
  const storageKey = `${STORAGE_KEY_PREFIX}${agencySlug || 'default'}_${ref}`;
  
  const getStoredCode = (): string | null => {
    if (!ref) return null;
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return null;
      
      const data: StoredVerification = JSON.parse(stored);
      if (Date.now() > data.expiresAt) {
        localStorage.removeItem(storageKey);
        return null;
      }
      return data.code;
    } catch {
      return null;
    }
  };
  
  const [verifiedPostalCode, setVerifiedPostalCodeState] = useState<string | null>(getStoredCode);
  
  const setVerifiedPostalCode = (code: string | null) => {
    if (code && ref) {
      const data: StoredVerification = {
        code,
        expiresAt: Date.now() + EXPIRATION_HOURS * 60 * 60 * 1000
      };
      localStorage.setItem(storageKey, JSON.stringify(data));
    } else if (ref) {
      localStorage.removeItem(storageKey);
    }
    setVerifiedPostalCodeState(code);
  };

  useEffect(() => {
    if (ref) {
      const stored = getStoredCode();
      if (stored !== verifiedPostalCode) {
        setVerifiedPostalCodeState(stored);
      }
    }
  }, [ref, storageKey]);
  
  return {
    isVerified: !!verifiedPostalCode,
    verifiedPostalCode,
    setVerifiedPostalCode
  };
}
