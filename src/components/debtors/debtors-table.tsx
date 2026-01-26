"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useRealtimeDebtors } from "@/hooks/use-realtime-debtors";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { markAsPaid, deleteDebtor } from "@/app/actions/debtors";
import { toast } from "sonner";
import {
    Trash2,
    Loader2,
    Calendar,
    DollarSign,
    CheckCircle2,
    Clock
} from "lucide-react";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";

export interface Debtor {
    id: string;
    clientName: string;
    phone: string;
    amountPaid: number;
    amountRemaining: number;
    dueDate: string | null;
    notes: string | null;
    status: "PENDENTE" | "PAGO";
    createdAt: string;
}

interface DebtorsTableProps {
    debtors: Debtor[];
    onNewDebtor: () => void;
}

export function DebtorsTable({ debtors, onNewDebtor }: DebtorsTableProps) {
    const router = useRouter();
    const [actionId, setActionId] = useState<string | null>(null);
    const [actionType, setActionType] = useState<"delete" | "pay" | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [localDebtors, setLocalDebtors] = useState(debtors);

    // Sync props com estado local (quando props mudam)
    useEffect(() => {
        setLocalDebtors(debtors);
    }, [debtors]);

    // Função de refresh para realtime
    const refreshDebtors = useCallback(() => {
        router.refresh();
    }, [router]);

    // Hook de realtime
    useRealtimeDebtors(refreshDebtors);

    const handleAction = async () => {
        if (!actionId || !actionType) return;

        setIsProcessing(true);
        let result;

        if (actionType === "delete") {
            result = await deleteDebtor(actionId);
        } else {
            result = await markAsPaid(actionId);
        }

        setIsProcessing(false);

        if (result.success) {
            toast.success(actionType === "delete" ? "Removido com sucesso" : "Marcado como pago!");
            router.refresh();
        } else {
            toast.error(result.error || "Erro na operação");
        }

        setActionId(null);
        setActionType(null);
    };

    const confirmPay = (id: string) => {
        setActionId(id);
        setActionType("pay");
    };

    const confirmDelete = (id: string) => {
        setActionId(id);
        setActionType("delete");
    };

    // Calcular totais
    const totalPending = localDebtors
        .filter(d => d.status === "PENDENTE")
        .reduce((sum, d) => sum + d.amountRemaining, 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Devedores</h2>
                    <p className="text-muted-foreground">
                        Total a receber: <span className="text-red-400 font-semibold">{totalPending.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                    </p>
                </div>
                <Button onClick={onNewDebtor} className="bg-brand-accent text-brand-bg hover:bg-brand-accent/90">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Novo Registro
                </Button>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
                {localDebtors.map(debtor => (
                    <Card key={debtor.id} className="bg-brand-card/50 border-white/[0.08]">
                        <CardContent className="p-4 space-y-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-semibold text-text-primary">{debtor.clientName}</h4>
                                    <p className="text-xs text-text-tertiary">{debtor.phone}</p>
                                </div>
                                <Badge variant={debtor.status === "PAGO" ? "default" : "destructive"}>
                                    {debtor.status === "PAGO" ? "PAGO" : "PENDENTE"}
                                </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <p className="text-text-tertiary text-xs">Pago</p>
                                    <p className="text-emerald-400 font-medium">
                                        {debtor.amountPaid.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-text-tertiary text-xs">Falta</p>
                                    <p className="text-red-400 font-medium">
                                        {debtor.amountRemaining.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                    </p>
                                </div>
                            </div>

                            {debtor.dueDate && (
                                <div className="flex items-center gap-2 text-xs text-text-secondary bg-white/[0.03] p-2 rounded">
                                    <Calendar className="w-3 h-3" />
                                    <span>Vence em: {format(new Date(debtor.dueDate), "dd/MM/yyyy")}</span>
                                </div>
                            )}

                            <div className="flex gap-2 pt-2">
                                {debtor.status === "PENDENTE" && (
                                    <Button
                                        className="flex-1 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
                                        size="sm"
                                        onClick={() => confirmPay(debtor.id)}
                                    >
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        PAGOU
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-text-tertiary hover:text-red-400"
                                    onClick={() => confirmDelete(debtor.id)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block rounded-xl border border-white/[0.08] overflow-hidden bg-brand-card/50">
                <Table>
                    <TableHeader>
                        <TableRow className="border-white/[0.06] hover:bg-transparent">
                            <TableHead>Cliente</TableHead>
                            <TableHead>Valor Pago</TableHead>
                            <TableHead>A Pagar</TableHead>
                            <TableHead>Vencimento</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {localDebtors.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    Nenhum registro encontrado.
                                </TableCell>
                            </TableRow>
                        ) : (
                            localDebtors.map((debtor) => (
                                <TableRow key={debtor.id} className="border-white/[0.04] hover:bg-white/[0.02]">
                                    <TableCell>
                                        <div>
                                            <div className="font-medium text-text-primary">{debtor.clientName}</div>
                                            <div className="text-xs text-text-tertiary">{debtor.phone}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-emerald-400 font-medium">
                                        {debtor.amountPaid.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                    </TableCell>
                                    <TableCell className="text-red-400 font-medium">
                                        {debtor.amountRemaining.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                    </TableCell>
                                    <TableCell>
                                        {debtor.dueDate ? (
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-3 h-3 text-text-tertiary" />
                                                <span>{format(new Date(debtor.dueDate), "dd/MM/yyyy")}</span>
                                            </div>
                                        ) : (
                                            <span className="text-text-tertiary">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className={debtor.status === "PAGO"
                                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                : "bg-red-500/10 text-red-400 border-red-500/20"
                                            }
                                        >
                                            {debtor.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {debtor.status === "PENDENTE" && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                                    onClick={() => confirmPay(debtor.id)}
                                                >
                                                    <CheckCircle2 className="w-4 h-4 mr-1" />
                                                    PAGOU
                                                </Button>
                                            )}
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 text-text-tertiary hover:text-red-400"
                                                onClick={() => confirmDelete(debtor.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <AlertDialog open={actionId !== null} onOpenChange={(open) => !open && setActionId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {actionType === "delete" ? "Excluir Registro?" : "Confirmar Pagamento?"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {actionType === "delete"
                                ? "Esta ação não pode ser desfeita. O registro será removido permanentemente."
                                : "Isso marcará a dívida como quitada e atualizará o valor pago para o total."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleAction}
                            className={actionType === "delete" ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}
                            disabled={isProcessing}
                        >
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
