"use client";

import { useCallback } from "react";
import { useRefreshManager } from "./use-refresh-manager";

export function useRealtimeFixedCosts(onRefresh: () => void) {
  // Callback memoizado
  const handleRefresh = useCallback(() => {
    onRefresh();
  }, [onRefresh]);

  // Usa o refresh manager centralizado
  useRefreshManager("fixed_costs", handleRefresh);
}
