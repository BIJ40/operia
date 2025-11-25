import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ApiToggleContextType {
  isApiEnabled: boolean;
  toggleApi: () => void;
}

const ApiToggleContext = createContext<ApiToggleContextType | undefined>(undefined);

export function ApiToggleProvider({ children }: { children: ReactNode }) {
  const [isApiEnabled, setIsApiEnabled] = useState(() => {
    const stored = localStorage.getItem('apiEnabled');
    return stored === null ? true : stored === 'true';
  });

  useEffect(() => {
    localStorage.setItem('apiEnabled', String(isApiEnabled));
  }, [isApiEnabled]);

  const toggleApi = () => {
    setIsApiEnabled(prev => !prev);
  };

  return (
    <ApiToggleContext.Provider value={{ isApiEnabled, toggleApi }}>
      {children}
    </ApiToggleContext.Provider>
  );
}

export function useApiToggle() {
  const context = useContext(ApiToggleContext);
  if (!context) {
    throw new Error('useApiToggle must be used within ApiToggleProvider');
  }
  return context;
}
