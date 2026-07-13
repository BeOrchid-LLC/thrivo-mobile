import { createElement, type ReactNode } from "react";
import { act, renderHook } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@/api";
import type { Water } from "@/contracts";
import { localDay } from "@/utils";
import { useAddWater } from "../hooks/useDashboard";

const mockUseAddWaterLog = jest.fn();

jest.mock("@/features/food-logging", () => ({
  useAddWaterLog: (...args: unknown[]) => mockUseAddWaterLog(...args),
}));

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
