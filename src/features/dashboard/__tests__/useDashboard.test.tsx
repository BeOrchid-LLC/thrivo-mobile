import { createElement, type ReactNode } from "react";
import { act, renderHook } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@/api";
import type { Water } from "@/contracts";
import { localDay } from "@/utils";
import { useAddWater, useDashboardMacros } from "../hooks/useDashboard";

const mockUseAddWaterLog = jest.fn();
const mockUseEntitlement = jest.fn();
const mockGetDashboardMacros = jest.fn();
const mockFlags = { gated: false };

jest.mock("@/features/food-logging", () => ({
  useAddWaterLog: (...args: unknown[]) => mockUseAddWaterLog(...args),
}));

jest.mock("@/hooks/useEntitlement", () => ({
  useEntitlement: () => mockUseEntitlement(),
}));

// A getter, so a test can flip the parked gate back on and still exercise the
// entitlement path the flag restores.
jest.mock("../flags", () => ({
  get DASHBOARD_MACROS_GATED() {
    return mockFlags.gated;
  },
}));

jest.mock("../api/dashboard.api", () => {
  const actual = jest.requireActual("../api/dashboard.api");
  return {
    ...actual,
    getDashboardMacros: (...args: unknown[]) => mockGetDashboardMacros(...args),
  };
});

function wrapperFor(queryClient: QueryClient) {
  function QueryWrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  }
  return QueryWrapper;
}

describe("useAddWater", () => {
  it("delegates dashboard quick-add to the offline water log mutation", () => {
    const day = localDay();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const water: Water = {
      day,
      totalMl: 0,
      targetMl: 2000,
      remainingMl: 2000,
      progressPercent: 0,
      glassMl: 300,
      glasses: 0,
      targetGlasses: 7,
      entries: [],
      alert: null,
    };
    const mutate = jest.fn();
    mockUseAddWaterLog.mockReturnValue({
      mutate,
      mutateAsync: jest.fn(),
      isPending: false,
      error: null,
    });
    queryClient.setQueryData(queryKeys.metrics.waterByDay(day), water);

    const { result } = renderHook(() => useAddWater(), { wrapper: wrapperFor(queryClient) });

    act(() => {
      result.current.mutate();
    });

    expect(mockUseAddWaterLog).toHaveBeenCalledWith(day);
    expect(mutate).toHaveBeenCalledWith(300, undefined);
  });
});

describe("useDashboardMacros", () => {
  beforeEach(() => {
    mockGetDashboardMacros.mockClear();
  });

  afterEach(() => {
    mockFlags.gated = false;
  });

  it("requests macros for free users when the gate is off", () => {
    mockUseEntitlement.mockReturnValue({ isPremium: false, isLoading: false });
    mockGetDashboardMacros.mockResolvedValue({});
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    const { result } = renderHook(() => useDashboardMacros(), {
      wrapper: wrapperFor(queryClient),
    });

    expect(result.current.isGated).toBe(false);
    expect(mockGetDashboardMacros).toHaveBeenCalled();
  });

  it("does not request premium macros for free users when the gate is on", () => {
    mockFlags.gated = true;
    mockUseEntitlement.mockReturnValue({ isPremium: false, isLoading: false });
    mockGetDashboardMacros.mockResolvedValue({});
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    const { result } = renderHook(() => useDashboardMacros(), {
      wrapper: wrapperFor(queryClient),
    });

    expect(result.current.isGated).toBe(true);
    expect(result.current.isPremium).toBe(false);
    expect(mockGetDashboardMacros).not.toHaveBeenCalled();
  });
});
