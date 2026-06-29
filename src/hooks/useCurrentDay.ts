import { useEffect, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { localDay } from "@/utils";

const nextMidnightDelay = (): number => {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return Math.max(next.getTime() - now.getTime() + 250, 1000);
};

export function useCurrentDay(): string {
  const [day, setDay] = useState(() => localDay());

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const refresh = () => {
      setDay(localDay());
      timeout = setTimeout(refresh, nextMidnightDelay());
    };

    timeout = setTimeout(refresh, nextMidnightDelay());
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") {
        setDay(localDay());
      }
    });

    return () => {
      if (timeout) clearTimeout(timeout);
      sub.remove();
    };
  }, []);

  return day;
}
