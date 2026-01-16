"use client";

import { Cell, Pie, PieChart, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SafeChartContainer } from "@/components/ui/safe-chart-container";

interface PackageDistributionChartProps {
    data: Array<{
        name: string;
        value: number;
        revenue: number;
        package: string;
    }>;
}

const PACKAGE_COLORS: Record<string, string> = {
    INTERMEDIARIO: "#94A3B8",
    AVANCADO: "#60A5FA",
    ELITE: "#A78BFA",
    PRO_PLUS: "#F472B6",
    ULTRA_PRO: "#FB923C",
    EVOLUTION: "#10B981",
};

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);

export function PackageDistributionChart({ data }: PackageDistributionChartProps) {
    const totalContracts = data.reduce((acc, item) => acc + item.value, 0);
    const totalRevenue = data.reduce((acc, item) => acc + item.revenue, 0);

    // Top package


    return (
        <Card className="col-span-full lg:col-span-3">
            <CardHeader>
                <CardTitle>Pacotes Mais Vendidos</CardTitle>
                <CardDescription>
                    {totalContracts} contratos | {formatCurrency(totalRevenue)} faturado
                </CardDescription>
            </CardHeader>
            <CardContent>
                <SafeChartContainer height={280} minHeight={200}>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            fill="#8884d8"
                            paddingAngle={3}
                            dataKey="value"
                            label={({ name, percent }: { name?: string; percent?: number }) =>
                                `${(name || "").split(" ")[1] || name || ""} ${((percent || 0) * 100).toFixed(0)}%`
                            }
                            labelLine={false}
                        >
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={PACKAGE_COLORS[entry.package] || "#888888"}
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

                {/* Mini ranking */}
                <div className="mt-4 space-y-2">
                    {data.slice(0, 3).map((item, index) => (
                        <div key={item.package} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: PACKAGE_COLORS[item.package] }}
                                />
                                <span className="text-muted-foreground">
                                    {index + 1}. {item.name}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="font-medium">{item.value}</span>
                                <span className="text-emerald-500 text-xs">{formatCurrency(item.revenue)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
