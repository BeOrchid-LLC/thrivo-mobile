import NetInfo from "@react-native-community/netinfo";
import { onlineManager } from "@tanstack/react-query";

/**
 * Bridge React Query's onlineManager to real device connectivity (NetInfo).
 * With this in place, mutations marked networkMode 'offlineFirst' pause while
 * offline and auto-resume the instant the device reconnects, so logging works
 * with no network and syncs on its own afterwards.
 */
export function initOnlineManager(): void {
  onlineManager.setEventListener((setOnline) => {
    const subscription = NetInfo.addEventListener((state) => {
      setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });
    return subscription;
  });
}
