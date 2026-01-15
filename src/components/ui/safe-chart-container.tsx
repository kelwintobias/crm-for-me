"use client";

import { useRef, useState, useEffect, ReactNode } from "react";
import { ResponsiveContainer } from "recharts";

interface SafeChartContainerProps {
  children: ReactNode;
  height?: number | string;
  minHeight?: number;
  className?: string;
}

/**
 * PERF FIX: Wrapper para gráficos Recharts que previne erros de dimensões negativas.
 *
 * O problema: ResponsiveContainer do Recharts causa erros quando o container pai
 * tem width/height 0 ou negativo (ex: quando em abas ocultas ou durante mount).
 *
 * A solução: Monitorar dimensões do container e só renderizar o gráfico quando válidas.
 */
export function SafeChartContainer({
  children,
  height = 300,
  minHeight = 100,
  className = "",
}: SafeChartContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Função para verificar dimensões
    const checkDimensions = () => {
      const rect = container.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);

      // Só renderiza se ambas dimensões forem válidas (> 10px para margem de segurança)
      if (width > 10 && height > 10) {
        setDimensions({ width, height });
        setIsReady(true);
      } else {
        setIsReady(false);
      }
    };

    // Verificação inicial com pequeno delay para garantir que o layout estabilizou
    const initialTimeout = setTimeout(checkDimensions, 50);

    // ResizeObserver para mudanças de tamanho
    const resizeObserver = new ResizeObserver((entries) => {
      // Usar requestAnimationFrame para evitar layout thrashing
      requestAnimationFrame(() => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 10 && height > 10) {
            setDimensions({ width: Math.floor(width), height: Math.floor(height) });
            setIsReady(true);
          } else {
            setIsReady(false);
          }
        }
      });
    });

    resizeObserver.observe(container);

    return () => {
      clearTimeout(initialTimeout);
      resizeObserver.disconnect();
    };
  }, []);

  const containerStyle = {
    width: "100%",
    height: typeof height === "number" ? `${height}px` : height,
    minHeight: `${minHeight}px`,
  };

  return (
    <div ref={containerRef} style={containerStyle} className={className}>
      {isReady && dimensions.width > 0 && dimensions.height > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="animate-pulse bg-white/5 rounded-lg w-full h-full" />
        </div>
      )}
    </div>
  );
}
