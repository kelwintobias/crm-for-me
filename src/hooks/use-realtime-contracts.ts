"use client";

import { useCallback } from "react";
import { useRefreshManager } from "./use-refresh-manager";

export function useRealtimeContracts(onRefresh: () => void) {
  // Callback memoizado
  const handleRefresh = useCallback(() => {
    onRefresh();
  }, [onRefresh]);

  // Usa o refresh manager centralizado
  useRefreshManager("contracts", handleRefresh);
}
