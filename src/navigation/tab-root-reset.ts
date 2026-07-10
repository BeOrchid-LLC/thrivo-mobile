import type { AppTabParamList } from "./types";

type TabName = keyof Pick<AppTabParamList, "dashboard" | "log" | "metrics" | "settings">;
type Listener = () => void;

const listeners = new Map<TabName, Set<Listener>>();

export function emitTabRootReset(tab: TabName) {
  listeners.get(tab)?.forEach((listener) => listener());
}

export function subscribeTabRootReset(tab: TabName, listener: Listener) {
  const tabListeners = listeners.get(tab) ?? new Set<Listener>();
  tabListeners.add(listener);
  listeners.set(tab, tabListeners);

  return () => {
    tabListeners.delete(listener);
    if (tabListeners.size === 0) listeners.delete(tab);
  };
}
