import React, { createContext, useContext, useState, useRef } from 'react';

interface ThreeJSStateContextType {
  forceRerender: () => void;
  lastUpdateTimestamp: React.MutableRefObject<number>;
}

const ThreeJSStateContext = createContext<ThreeJSStateContextType | null>(null);

export const ThreeJSStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [renderKey, setRenderKey] = useState(0);
  const lastUpdateTimestamp = useRef(Date.now());

  const forceRerender = () => {
    lastUpdateTimestamp.current = Date.now();
    setRenderKey(prev => prev + 1);
  };

  return (
    <ThreeJSStateContext.Provider value={{ forceRerender, lastUpdateTimestamp }}>
      {children}
    </ThreeJSStateContext.Provider>
  );
};

export const useThreeJSState = () => {
  const context = useContext(ThreeJSStateContext);
  if (!context) {
    throw new Error('useThreeJSState must be used within a ThreeJSStateProvider');
  }
  return context;
}; 