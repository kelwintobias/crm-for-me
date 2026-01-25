import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminLogsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Check admin role using Prisma
    const dbUser = await prisma.user.findUnique({
        where: { email: user.email! },
        select: { role: true }
    });

    if (!dbUser || dbUser.role !== "ADMIN") {
        return <div className="p-8 text-center text-red-500">Acesso negado. Apenas administradores podem ver esta página.</div>;
    }

    const logs = await prisma.webhookLog.findMany({
        orderBy: {
            createdAt: "desc",
        },
        take: 100, // Limit to last 100 for now
    });

    return (
        <div className="container mx-auto py-8 space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Logs de Webhooks</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Últimos Eventos</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Data/Hora</TableHead>
                                <TableHead>Provider</TableHead>
                                <TableHead>Evento</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Erro</TableHead>
                                <TableHead className="text-right">Payload</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-4">
                                        Nenhum log encontrado.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                logs.map((log: any) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="whitespace-nowrap">
                                            {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss", {
                                                locale: ptBR,
                                            })}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{log.provider}</Badge>
                                        </TableCell>
                                        <TableCell>{log.event || "-"}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    log.status === "SUCCESS"
                                                        ? "default" // or success/green if configured
                                                        : "destructive"
                                                }
                                                className={log.status === "SUCCESS" ? "bg-green-600 hover:bg-green-700" : ""}
                                            >
                                                {log.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="max-w-[200px] truncate text-red-500 text-sm">
                                            {log.error}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <details className="cursor-pointer">
                                                <summary className="text-xs text-blue-500 hover:underline select-none">Ver JSON</summary>
                                                <pre className="mt-2 w-[400px] max-h-[300px] overflow-auto text-left text-xs bg-slate-950 text-slate-50 p-4 rounded absolute right-12 z-10 shadow-lg border border-slate-800">
                                                    {JSON.stringify(JSON.parse(log.payload || "{}"), null, 2)}
                                                </pre>
                                            </details>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
