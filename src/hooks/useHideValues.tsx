import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface HideValuesContextType {
  hidden: boolean;
  toggle: () => void;
  mask: (value: string) => string;
}

const HideValuesContext = createContext<HideValuesContextType | undefined>(undefined);

const STORAGE_KEY = 'hide-values';

export function HideValuesProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(hidden));
  }, [hidden]);

  const toggle = () => setHidden(v => !v);
  const mask = (value: string) => (hidden ? '••••••' : value);

  return (
    <HideValuesContext.Provider value={{ hidden, toggle, mask }}>
      {children}
    </HideValuesContext.Provider>
  );
}

export function useHideValues() {
  const ctx = useContext(HideValuesContext);
  if (!ctx) {
    // Safe fallback when used outside provider
    return { hidden: false, toggle: () => {}, mask: (v: string) => v };
  }
  return ctx;
}
