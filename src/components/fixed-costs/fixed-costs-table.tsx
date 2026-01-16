"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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
import { deleteFixedCost } from "@/app/actions/fixed-costs";
import { toast } from "sonner";
import {
    Wallet,
    Trash2,
    Loader2,
    Calendar,
    Plus,
    ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { PlainFixedCost } from "@/app/actions/fixed-costs";

interface FixedCostsTableProps {
    costs: PlainFixedCost[];
    onNewCost: () => void;
}

export function FixedCostsTable({ costs, onNewCost }: FixedCostsTableProps) {
    const router = useRouter();
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [expandedMonths, setExpandedMonths] = useState<Set<string>>(() => {
        // Mês atual expandido por padrão
        const now = new Date();
        const currentMonthYear = format(now, "MMMM yyyy", { locale: ptBR });
        return new Set([currentMonthYear]);
    });

    const toggleMonth = (monthYear: string) => {
        setExpandedMonths(prev => {
            const next = new Set(prev);
            if (next.has(monthYear)) {
                next.delete(monthYear);
            } else {
                next.add(monthYear);
            }
            return next;
        });
    };

    // Agrupar custos por mês/ano
    const groupedCosts = useMemo(() => {
        const groups: Record<string, PlainFixedCost[]> = {};

        costs.forEach(cost => {
            const date = new Date(cost.date);
            const key = format(date, "MMMM yyyy", { locale: ptBR });

            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(cost);
        });

        // Ordenar grupos por data (mais recente primeiro)
        const sortedKeys = Object.keys(groups).sort((a, b) => {
            const dateA = new Date(groups[a][0].date);
            const dateB = new Date(groups[b][0].date);
            return dateB.getTime() - dateA.getTime();
        });

        return sortedKeys.map(key => ({
            monthYear: key,
            costs: groups[key],
            total: groups[key].reduce((sum, c) => sum + c.value, 0),
        }));
    }, [costs]);

    const handleDelete = async () => {
        if (!deleteId) return;

        setIsDeleting(true);
        const result = await deleteFixedCost(deleteId);
        setIsDeleting(false);

        if (result.success) {
            toast.success("Custo fixo excluído com sucesso");
            router.refresh();
        } else {
            toast.error(result.error || "Erro ao excluir custo fixo");
        }

        setDeleteId(null);
    };

    if (costs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-4">
                    <Wallet className="w-8 h-8 text-orange-500" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                    Nenhum custo fixo cadastrado
                </h3>
                <p className="text-text-secondary mb-6 max-w-sm">
                    Comece cadastrando seus custos fixos para acompanhar suas despesas mensais.
                </p>
                <Button onClick={onNewCost} className="bg-orange-500 hover:bg-orange-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Custo
                </Button>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-6">
                {/* Botão Adicionar Custo - sempre visível */}
                <div className="flex justify-end">
                    <Button onClick={onNewCost} className="bg-orange-500 hover:bg-orange-600">
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Custo
                    </Button>
                </div>

                {groupedCosts.map(group => (
                    <div key={group.monthYear} className="space-y-3">
                        {/* Header do Grupo */}
                        <div
                            className="flex items-center justify-between px-1 cursor-pointer hover:bg-white/[0.02] rounded-lg py-2 -my-2 transition-colors"
                            onClick={() => toggleMonth(group.monthYear)}
                        >
                            <div className="flex items-center gap-3">
                                <ChevronRight
                                    className={cn(
                                        "w-4 h-4 text-text-tertiary transition-transform",
                                        expandedMonths.has(group.monthYear) && "rotate-90"
                                    )}
                                />
                                <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                                    <Calendar className="w-4 h-4 text-orange-500" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-text-primary capitalize">
                                        {group.monthYear}
                                    </h3>
                                    <p className="text-xs text-text-tertiary">
                                        {group.costs.length} custo{group.costs.length !== 1 ? "s" : ""}
                                    </p>
                                </div>
                            </div>
                            <div className="px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
                                <span className="text-sm font-semibold text-orange-400">
                                    {group.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                </span>
                            </div>
                        </div>

                        {/* Tabela do Grupo - condicional */}
                        {expandedMonths.has(group.monthYear) && (
                            <div className="rounded-xl border border-white/[0.08] overflow-hidden bg-brand-card/50">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-white/[0.06] hover:bg-transparent">
                                            <TableHead className="text-text-tertiary">Data</TableHead>
                                            <TableHead className="text-text-tertiary">Tipo</TableHead>
                                            <TableHead className="text-text-tertiary">Categoria</TableHead>
                                            <TableHead className="text-text-tertiary">Descrição</TableHead>
                                            <TableHead className="text-text-tertiary text-right">Valor</TableHead>
                                            <TableHead className="text-text-tertiary text-center">Mês</TableHead>
                                            <TableHead className="text-text-tertiary text-center">Ano</TableHead>
                                            <TableHead className="text-text-tertiary w-12"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {group.costs.map(cost => (
                                            <TableRow
                                                key={cost.id}
                                                className="border-white/[0.04] hover:bg-white/[0.02]"
                                            >
                                                <TableCell className="font-mono text-sm">
                                                    {format(new Date(cost.date), "dd/MM/yy")}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-xs px-2 py-1 rounded-md bg-red-500/10 text-red-400 border border-red-500/20">
                                                        {cost.type}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-text-secondary">
                                                    {cost.category}
                                                </TableCell>
                                                <TableCell className="font-medium text-text-primary">
                                                    {cost.description}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <span className="font-semibold text-orange-400">
                                                        {cost.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-center text-text-secondary">
                                                    {cost.month}
                                                </TableCell>
                                                <TableCell className="text-center text-text-secondary">
                                                    {cost.year}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-text-tertiary hover:text-red-400 hover:bg-red-500/10"
                                                        onClick={() => setDeleteId(cost.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Dialog de confirmação de exclusão */}
            <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Custo Fixo?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. O custo fixo será permanentemente removido do sistema.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Excluindo...
                                </>
                            ) : (
                                "Sim, excluir"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
