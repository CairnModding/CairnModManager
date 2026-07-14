import { createContext, useContext, type ReactNode } from "react";
import type { AppContainer } from "../composition";

const ContainerContext = createContext<AppContainer | undefined>(undefined);

export function ContainerProvider({
  container,
  children,
}: {
  container: AppContainer;
  children: ReactNode;
}) {
  return <ContainerContext.Provider value={container}>{children}</ContainerContext.Provider>;
}

export function useContainer(): AppContainer {
  const container = useContext(ContainerContext);
  if (!container) throw new Error("useContainer() called outside <ContainerProvider>");
  return container;
}
