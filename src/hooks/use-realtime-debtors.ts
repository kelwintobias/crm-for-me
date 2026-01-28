"use client";

import { useCallback } from "react";
import { useRefreshManager } from "./use-refresh-manager";

export function useRealtimeDebtors(onRefresh: () => void) {
  // Callback memoizado
  const handleRefresh = useCallback(() => {
    onRefresh();
  }, [onRefresh]);

  // Usa o refresh manager centralizado
  useRefreshManager("debtors", handleRefresh);
}
