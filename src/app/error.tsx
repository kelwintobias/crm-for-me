"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      <div className="text-center w-full max-w-lg">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 mb-4">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary mb-2">
          Algo deu errado!
        </h1>
        <p className="text-text-secondary mb-6">
          Ocorreu um erro inesperado. Por favor, tente novamente.
        </p>

        <div className="flex flex-col gap-4 items-center">
          <Button onClick={reset} className="w-full sm:w-auto">
            <RefreshCcw className="w-4 h-4 mr-2" />
            Tentar novamente
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="text-muted-foreground hover:text-text-primary"
          >
            {showDetails ? "Ocultar detalhes" : "Ver logs do erro"}
          </Button>
        </div>

        {showDetails && (
          <div className="mt-6 text-left bg-muted/50 p-4 rounded-lg overflow-auto max-h-[300px] text-xs font-mono border border-border">
            <p className="font-semibold text-red-400 mb-2">{error.message}</p>
            {error.digest && (
              <p className="text-muted-foreground mb-2">Digest: {error.digest}</p>
            )}
            {error.stack && (
              <pre className="text-muted-foreground whitespace-pre-wrap break-all">
                {error.stack}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
