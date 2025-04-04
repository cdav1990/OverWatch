import React, { createContext, useState, useMemo, useContext, ReactNode } from 'react';

export type AppMode = 'dev' | 'ops' | null;

interface AppContextType {
  appMode: AppMode;
  setAppMode: (mode: 'dev' | 'ops') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [appMode, setAppModeInternal] = useState<AppMode>(null);

  const setAppMode = (mode: 'dev' | 'ops') => {
    console.log(`Setting App Mode: ${mode}`); // Log mode selection
    setAppModeInternal(mode);
  };

  const contextValue = useMemo(() => ({ appMode, setAppMode }), [appMode]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}; 