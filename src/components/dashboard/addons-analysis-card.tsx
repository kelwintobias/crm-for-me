"use client";

import { useMemo } from "react";
import { Bar, BarChart, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SafeChartContainer } from "@/components/ui/safe-chart-container";
import { Package, TrendingUp, Percent } from "lucide-react";

interface AddonsAnalysisCardProps {
    data: Array<{
        name: string;
        value: number;
        addon: string;
    }>;
    addonPercentage: number;
    contractsWithAddons: number;
    totalContracts: number;
}

const ADDON_COLORS = [
    "#10B981",
    "#3B82F6",
    "#8B5CF6",
    "#F59E0B",
    "#EC4899",
];

export function AddonsAnalysisCard({
    data,
    addonPercentage,
    contractsWithAddons,
    totalContracts,
}: AddonsAnalysisCardProps) {
    const topAddon = data.length > 0 ? data[0] : null;

    // Dados formatados para o gráfico
    const chartData = useMemo(() => {
        return data.map((item, index) => ({
            ...item,
            shortName: item.name.length > 15 ? item.name.slice(0, 12) + "..." : item.name,
            color: ADDON_COLORS[index % ADDON_COLORS.length],
        }));
    }, [data]);

    return (
        <Card className="col-span-full lg:col-span-4">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-violet-500" />
                            Analise de Adicionais
                        </CardTitle>
                        <CardDescription>
                            {contractsWithAddons} de {totalContracts} contratos incluem adicionais
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 bg-violet-500/10 rounded-lg">
                        <Percent className="h-4 w-4 text-violet-500" />
                        <span className="text-lg font-bold text-violet-500">{addonPercentage}%</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {data.length > 0 ? (
                    <>
                        <SafeChartContainer height={200} minHeight={150}>
                            <BarChart
                                data={chartData}
                                layout="vertical"
                                margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                                <XAxis type="number" stroke="#888888" fontSize={12} />
                                <YAxis
                                    type="category"
                                    dataKey="shortName"
                                    stroke="#888888"
                                    fontSize={11}
                                    width={100}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: "rgba(255,255,255,0.05)" }}
                                    contentStyle={{
                                        backgroundColor: "hsl(var(--card))",
                                        borderColor: "hsl(var(--border))",
                                        borderRadius: "8px",
                                    }}
                                    formatter={(value) => [`${value} vendas`, ""]}
                                    labelFormatter={(label) => {
                                        const item = data.find(d =>
                                            d.name.startsWith(String(label).replace("...", ""))
                                        );
                                        return item?.name || label;
                                    }}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={30}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </SafeChartContainer>

                        {/* Insight */}
                        {topAddon && (
                            <div className="mt-4 p-3 bg-violet-500/5 border border-violet-500/20 rounded-lg">
                                <div className="flex items-center gap-2 text-sm">
                                    <TrendingUp className="h-4 w-4 text-violet-500" />
                                    <span className="text-muted-foreground">
                                        <span className="font-medium text-foreground">{topAddon.name}</span> e o adicional
                                        mais popular com {topAddon.value} vendas
                                    </span>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                        Nenhum adicional vendido ainda
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
