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
  NOVO_LEAD: <Users className="w-4 h-4" />,
  EM_NEGOCIACAO: <MessageSquare className="w-4 h-4" />,
  AGENDADO: <RefreshCcw className="w-4 h-4" />,
  EM_ATENDIMENTO: <Package className="w-4 h-4" />,
  POS_VENDA: <Package className="w-4 h-4" />,
  FINALIZADO: <Package className="w-4 h-4" />,
  PERDIDO: <Archive className="w-4 h-4" />,
};

const STAGE_COLORS: Record<string, { bg: string, text: string, hex: string }> = {
  NOVO_LEAD: { bg: "bg-blue-500", text: "text-blue-500", hex: "#3B82F6" },
  EM_NEGOCIACAO: { bg: "bg-amber-500", text: "text-amber-500", hex: "#F59E0B" },
  AGENDADO: { bg: "bg-indigo-500", text: "text-indigo-500", hex: "#6366F1" },
  EM_ATENDIMENTO: { bg: "bg-purple-500", text: "text-purple-500", hex: "#A855F7" },
  POS_VENDA: { bg: "bg-pink-500", text: "text-pink-500", hex: "#EC4899" },
  FINALIZADO: { bg: "bg-emerald-500", text: "text-emerald-500", hex: "#10B981" },
  PERDIDO: { bg: "bg-red-500", text: "text-red-500", hex: "#EF4444" },
};

export function ConversionFunnel({ data, taxaConversao }: ConversionFunnelProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const total = data.reduce((acc, d) => acc + d.value, 0);

  // Filtra para não mostrar PERDIDO no funil principal se não for desejado
  // Mas se vier do backend, já vem ordenado. Aqui filtrando PERDIDO para exibir separado se quiser
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
          const colors = STAGE_COLORS[item.stage] || { bg: "bg-gray-500", text: "text-gray-500", hex: "#6B7280" };

          return (
            <div key={item.stage} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={`p-1.5 rounded ${colors.bg}/20 ${colors.text}`}>
                    {STAGE_ICONS[item.stage] || <Users className="w-4 h-4" />}
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
                  className={`h-full rounded-full transition-all duration-500`}
                  style={{ width: `${width}%`, backgroundColor: colors.hex }}
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
