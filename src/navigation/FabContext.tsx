import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type FabContextValue = {
  openFab: () => void;
  closeFab: () => void;
  isFabVisible: boolean;
};

const FabContext = createContext<FabContextValue | null>(null);

export function FabProvider({ children }: { children: React.ReactNode }) {
  const [isFabVisible, setIsFabVisible] = useState(false);
  const openFab = useCallback(() => setIsFabVisible(true), []);
  const closeFab = useCallback(() => setIsFabVisible(false), []);
  const value = useMemo(
    () => ({ openFab, closeFab, isFabVisible }),
    [openFab, closeFab, isFabVisible]
  );

  return <FabContext.Provider value={value}>{children}</FabContext.Provider>;
}

export function useFab(): FabContextValue {
  const context = useContext(FabContext);
  if (!context) {
    throw new Error("useFab must be used within a FabProvider");
  }
  return context;
}
