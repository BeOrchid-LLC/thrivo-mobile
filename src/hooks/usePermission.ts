import { useCallback, useEffect, useState } from "react";
import { useCameraPermissions } from "expo-camera";
import * as Notifications from "expo-notifications";

/**
 * Uniform permission shape so screens can request a capability at point-of-use
 * and render a graceful denial fallback (MOBILE_ARCHITECTURE §8). `request`
 * resolves to whether permission was granted.
 */
export interface PermissionState {
  granted: boolean;
  canAskAgain: boolean;
  loading: boolean;
  request: () => Promise<boolean>;
}

/** Camera permission for the barcode scanner; denial → manual food search. */
export function useCameraPermission(): PermissionState {
  const [permission, requestPermission] = useCameraPermissions();

  const request = useCallback(async () => {
    const result = await requestPermission();
    return result.granted;
  }, [requestPermission]);

  return {
    granted: permission?.granted ?? false,
    canAskAgain: permission?.canAskAgain ?? true,
    loading: permission === null,
    request,
  };
}

/** Notification permission for the daily nudge; denial → in-app reminder only. */
export function useNotificationPermission(): PermissionState {
  const [state, setState] = useState({ granted: false, canAskAgain: true, loading: true });

  useEffect(() => {
    let active = true;
    void Notifications.getPermissionsAsync().then((p) => {
      if (active) setState({ granted: p.granted, canAskAgain: p.canAskAgain, loading: false });
    });
    return () => {
      active = false;
    };
  }, []);

  const request = useCallback(async () => {
    const p = await Notifications.requestPermissionsAsync();
    setState({ granted: p.granted, canAskAgain: p.canAskAgain, loading: false });
    return p.granted;
  }, []);

  return { ...state, request };
}
