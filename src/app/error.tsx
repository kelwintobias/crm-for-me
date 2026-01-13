"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 mb-4">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary mb-2">
          Algo deu errado!
        </h1>
        <p className="text-text-secondary mb-6 max-w-md">
          Ocorreu um erro inesperado. Por favor, tente novamente.
        </p>
        <Button onClick={reset}>
          <RefreshCcw className="w-4 h-4 mr-2" />
          Tentar novamente
        </Button>
      </div>
    </div>
  );
}
