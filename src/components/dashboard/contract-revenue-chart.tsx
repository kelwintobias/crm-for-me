"use client";

import {
    Area,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Legend,
    ComposedChart,
    Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SafeChartContainer } from "@/components/ui/safe-chart-container";
import { TrendingUp, TrendingDown } from "lucide-react";

interface ContractRevenueChartProps {
    data: Array<{
        month: string;
        receita: number;
        contratos: number;
    }>;
    growth?: number;
}

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);

export function ContractRevenueChart({ data, growth = 0 }: ContractRevenueChartProps) {
    const totalRevenue = data.reduce((acc, item) => acc + item.receita, 0);
    const totalContracts = data.reduce((acc, item) => acc + item.contratos, 0);
    const isPositive = growth >= 0;

    return (
        <Card className="col-span-full lg:col-span-4">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Faturamento Mensal</CardTitle>
                        <CardDescription>
                            {formatCurrency(totalRevenue)} em {totalContracts} contratos (6 meses)
                        </CardDescription>
                    </div>
                    {growth !== 0 && (
                        <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? "text-emerald-500" : "text-red-500"}`}>
                            {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                            {Math.abs(growth).toFixed(1)}%
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="pl-2">
                <SafeChartContainer height={300} minHeight={200}>
                    <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis
                            dataKey="month"
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            yAxisId="left"
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
                        />
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip
                            cursor={{ fill: "rgba(255,255,255,0.05)" }}
                            contentStyle={{
                                backgroundColor: "#18181B",
                                borderColor: "#3F3F46",
                                borderRadius: "8px",
                                padding: "12px 16px",
                            }}
                            formatter={(value, name) => {
                                if (name === "receita") return [formatCurrency(Number(value)), "Receita"];
                                return [value, "Contratos"];
                            }}
                            labelStyle={{ color: "#FFFFFF", fontWeight: 600, marginBottom: "8px" }}
                            itemStyle={{ color: "#E4E4E7" }}
                        />
                        <Legend
                            wrapperStyle={{ paddingTop: "20px" }}
                            formatter={(value) => (
                                <span className="text-sm text-muted-foreground">
                                    {value === "receita" ? "Receita" : "Contratos"}
                                </span>
                            )}
                        />
                        <Area
                            yAxisId="left"
                            type="monotone"
                            dataKey="receita"
                            stroke="#10B981"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorReceita)"
                        />
                        <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="contratos"
                            stroke="#3B82F6"
                            strokeWidth={2}
                            dot={{ fill: "#3B82F6", strokeWidth: 2, r: 4 }}
                        />
                    </ComposedChart>
                </SafeChartContainer>
            </CardContent>
        </Card>
    );
}
