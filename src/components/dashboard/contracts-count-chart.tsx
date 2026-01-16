"use client";

import {
    Bar,
    BarChart,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SafeChartContainer } from "@/components/ui/safe-chart-container";
import { FileText } from "lucide-react";

interface ContractsCountChartProps {
    data: Array<{
        month: string;
        contratos: number;
        receita?: number;
    }>;
}

// Cores gradientes para as barras
const COLORS = [
    "#3B82F6", // blue-500
    "#6366F1", // indigo-500
    "#8B5CF6", // violet-500
    "#A855F7", // purple-500
    "#C026D3", // fuchsia-600
    "#DB2777", // pink-600
    "#EC4899", // pink-500
    "#F43F5E", // rose-500
    "#EF4444", // red-500
    "#F97316", // orange-500
    "#F59E0B", // amber-500
    "#10B981", // emerald-500
];

export function ContractsCountChart({ data }: ContractsCountChartProps) {
    const totalContracts = data.reduce((acc, item) => acc + item.contratos, 0);
    const avgContractsPerMonth = data.length > 0 ? Math.round(totalContracts / data.length) : 0;
    const maxContracts = Math.max(...data.map(d => d.contratos), 0);
    const bestMonth = data.find(d => d.contratos === maxContracts);

    return (
        <Card className="col-span-full lg:col-span-4">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-500" />
                            Contratos Realizados
                        </CardTitle>
                        <CardDescription>
                            {totalContracts} contratos no período
                            {avgContractsPerMonth > 0 && ` • Média: ${avgContractsPerMonth}/mês`}
                            {bestMonth && ` • Melhor: ${bestMonth.month}`}
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pl-2">
                <SafeChartContainer height={300} minHeight={200}>
                    <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#3B82F6" stopOpacity={1} />
                                <stop offset="100%" stopColor="#6366F1" stopOpacity={0.8} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                            dataKey="month"
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            allowDecimals={false}
                        />
                        <Tooltip
                            cursor={{ fill: "rgba(255,255,255,0.05)" }}
                            contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                borderColor: "hsl(var(--border))",
                                borderRadius: "8px",
                            }}
                            formatter={(value) => [`${value} contratos`, "Quantidade"]}
                            labelStyle={{ color: "hsl(var(--foreground))" }}
                        />
                        <Bar
                            dataKey="contratos"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={50}
                        >
                            {data.map((_, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={COLORS[index % COLORS.length]}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </SafeChartContainer>
            </CardContent>
        </Card>
    );
}
