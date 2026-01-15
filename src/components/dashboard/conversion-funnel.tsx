"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, MessageSquare, Package, RefreshCcw, Archive } from "lucide-react";

interface ConversionFunnelProps {
  data: Array<{
    stage: string;
    name: string;
    value: number;
  }>;
  taxaConversao: number;
}

const STAGE_ICONS: Record<string, React.ReactNode> = {
  NOVOS: <Users className="w-4 h-4" />,
  EM_CONTATO: <MessageSquare className="w-4 h-4" />,
  VENDIDO_UNICO: <Package className="w-4 h-4" />,
  VENDIDO_MENSAL: <RefreshCcw className="w-4 h-4" />,
  PERDIDO: <Archive className="w-4 h-4" />,
};

const STAGE_COLORS: Record<string, string> = {
  NOVOS: "bg-blue-500",
  EM_CONTATO: "bg-amber-500",
  VENDIDO_UNICO: "bg-emerald-500",
  VENDIDO_MENSAL: "bg-brand-accent",
  PERDIDO: "bg-red-500",
};

export function ConversionFunnel({ data, taxaConversao }: ConversionFunnelProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const total = data.reduce((acc, d) => acc + d.value, 0);

  // Filtra para não mostrar PERDIDO no funil principal
  const funnelData = data.filter((d) => d.stage !== "PERDIDO");
  const perdidos = data.find((d) => d.stage === "PERDIDO")?.value || 0;

  return (
    <Card className="col-span-full lg:col-span-3">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Funil de Conversao</CardTitle>
            <CardDescription>Distribuicao dos leads por etapa</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-brand-accent">{taxaConversao}%</p>
            <p className="text-xs text-muted-foreground">Taxa de conversao</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {funnelData.map((item) => {
          const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
          const width = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
          const color = STAGE_COLORS[item.stage] || "bg-gray-500";

          return (
            <div key={item.stage} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={`p-1.5 rounded ${color}/20 text-${color.replace("bg-", "")}`}>
                    {STAGE_ICONS[item.stage]}
                  </span>
                  <span className="font-medium">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{percentage}%</span>
                  <span className="font-bold">{item.value}</span>
                </div>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${color} rounded-full transition-all duration-500`}
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}

        {/* Perdidos separado */}
        {perdidos > 0 && (
          <div className="pt-4 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded bg-red-500/20 text-red-500">
                  <Archive className="w-4 h-4" />
                </span>
                <span className="font-medium text-red-400">Perdidos</span>
              </div>
              <span className="font-bold text-red-400">{perdidos}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
