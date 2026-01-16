"use client";

import { Cell, Pie, PieChart, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SafeChartContainer } from "@/components/ui/safe-chart-container";
import { Users } from "lucide-react";

interface ContractSourceChartProps {
    data: Array<{
        name: string;
        value: number;
        revenue: number;
        source: string;
    }>;
}

const SOURCE_COLORS: Record<string, string> = {
    ANUNCIO: "#3B82F6",
    INDICACAO: "#10B981",
    INFLUENCIADOR: "#F59E0B",
    PARCEIRO: "#8B5CF6",
};

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);

export function ContractSourceChart({ data }: ContractSourceChartProps) {
    const totalContracts = data.reduce((acc, item) => acc + item.value, 0);

    // Melhor fonte por receita
    const bestByRevenue = data.length > 0
        ? [...data].sort((a, b) => b.revenue - a.revenue)[0]
        : null;

    return (
        <Card className="col-span-full lg:col-span-3">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-500" />
                    Origem dos Contratos
                </CardTitle>
                <CardDescription>
                    De onde vem seus clientes
                </CardDescription>
            </CardHeader>
            <CardContent>
                {data.length > 0 ? (
                    <>
                        <SafeChartContainer height={220} minHeight={180}>
                            <PieChart>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={45}
                                    outerRadius={70}
                                    fill="#8884d8"
                                    paddingAngle={4}
                                    dataKey="value"
                                    label={({ percent }: { percent?: number }) =>
                                        `${((percent || 0) * 100).toFixed(0)}%`
                                    }
                                    labelLine={false}
                                >
                                    {data.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={SOURCE_COLORS[entry.source] || "#888888"}
                                            className="stroke-background"
                                            strokeWidth={2}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "hsl(var(--card))",
                                        borderColor: "hsl(var(--border))",
                                        borderRadius: "8px",
                                    }}
                                    formatter={(value, name, props) => {
                                        const revenue = props.payload?.revenue || 0;
                                        return [
                                            <div key="tooltip" className="space-y-1">
                                                <div>{value} contratos</div>
                                                <div className="text-emerald-500">{formatCurrency(revenue)}</div>
                                            </div>,
                                            String(name),
                                        ];
                                    }}
                                />
                            </PieChart>
                        </SafeChartContainer>

                        {/* Lista de fontes */}
                        <div className="mt-4 space-y-2">
                            {data.map((item) => {
                                const percentage = totalContracts > 0
                                    ? Math.round((item.value / totalContracts) * 100)
                                    : 0;

                                return (
                                    <div key={item.source} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: SOURCE_COLORS[item.source] }}
                                            />
                                            <span className="text-muted-foreground">{item.name}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-medium">{item.value}</span>
                                            <span className="text-xs text-muted-foreground">({percentage}%)</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Insight da melhor fonte */}
                        {bestByRevenue && (
                            <div className="mt-4 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                                <p className="text-sm text-muted-foreground">
                                    <span className="font-medium text-foreground">{bestByRevenue.name}</span> gerou{" "}
                                    <span className="font-medium text-emerald-500">
                                        {formatCurrency(bestByRevenue.revenue)}
                                    </span>{" "}
                                    em receita
                                </p>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="h-[220px] flex items-center justify-center text-muted-foreground">
                        Nenhum contrato registrado
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
