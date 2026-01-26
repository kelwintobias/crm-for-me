"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useRealtimeContracts } from "@/hooks/use-realtime-contracts";
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
import { deleteContract } from "@/app/actions/contracts";
import { toast } from "sonner";
import {
    FileText,
    Trash2,
    Loader2,
    Calendar,
    Plus,
    ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn, formatPhone } from "@/lib/utils";
import type { ContractSource, ContractPackage } from "@prisma/client";

// Labels
const PACKAGE_LABELS: Record<ContractPackage, string> = {
    INTERMEDIARIO: "Intermediário",
    AVANCADO: "Avançado",
    ELITE: "Elite",
    PRO_PLUS: "Pro Plus",
    ULTRA_PRO: "Ultra Pro",
    EVOLUTION: "Evolution",
};

const SOURCE_LABELS: Record<ContractSource, string> = {
    ANUNCIO: "Anúncio",
    INDICACAO: "Indicação",
    INFLUENCIADOR: "Influenciador",
    PARCEIRO: "Parceiro",
};

const ADDON_LABELS: Record<string, string> = {
    "ATIVACAO_WINDOWS": "Ativação Windows",
    "UPBOOST_PLUS": "UPBOOST+",
    "REMOCAO_DELAY": "Remoção Delay",
    "FORMATACAO_PADRAO": "Format. Padrão",
    "FORMATACAO_PROFISSIONAL": "Format. Prof.",
};

export interface PlainContract {
    id: string;
    userId: string;
    clientName: string;
    email: string | null;
    whatsapp: string;
    instagram: string | null;
    cpf: string | null;
    contractDate: string;
    source: ContractSource;
    package: ContractPackage;
    addons: string[];
    termsAccepted: boolean;
    totalValue: number;
    createdAt: string;
    updatedAt: string;
}

interface ContractsTableProps {
    contracts: PlainContract[];
    onNewContract: () => void;
}

export function ContractsTable({ contracts, onNewContract }: ContractsTableProps) {
    const router = useRouter();
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [expandedMonths, setExpandedMonths] = useState<Set<string>>(() => {
        // Janeiro 2026 expandido por padrão
        return new Set(["janeiro 2026"]);
    });
    const [localContracts, setLocalContracts] = useState(contracts);

    // Sync props com estado local (quando props mudam)
    useEffect(() => {
        setLocalContracts(contracts);
    }, [contracts]);

    // Função de refresh para realtime
    const refreshContracts = useCallback(() => {
        router.refresh();
    }, [router]);

    // Hook de realtime
    useRealtimeContracts(refreshContracts);

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

    // Agrupar contratos por mês/ano
    const groupedContracts = useMemo(() => {
        const groups: Record<string, PlainContract[]> = {};

        localContracts.forEach(contract => {
            const date = new Date(contract.contractDate);
            const key = format(date, "MMMM yyyy", { locale: ptBR });

            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(contract);
        });

        // Ordenar grupos por data (mais recente primeiro)
        const sortedKeys = Object.keys(groups).sort((a, b) => {
            const dateA = new Date(groups[a][0].contractDate);
            const dateB = new Date(groups[b][0].contractDate);
            return dateB.getTime() - dateA.getTime();
        });

        return sortedKeys.map(key => ({
            monthYear: key,
            contracts: groups[key],
            total: groups[key].reduce((sum, c) => sum + c.totalValue, 0),
        }));
    }, [localContracts]);

    const handleDelete = async () => {
        if (!deleteId) return;

        setIsDeleting(true);
        const result = await deleteContract(deleteId);
        setIsDeleting(false);

        if (result.success) {
            toast.success("Contrato excluído com sucesso");
            router.refresh();
        } else {
            toast.error(result.error || "Erro ao excluir contrato");
        }

        setDeleteId(null);
    };

    if (localContracts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                    Nenhum contrato cadastrado
                </h3>
                <p className="text-text-secondary mb-6 max-w-sm">
                    Comece cadastrando seu primeiro contrato para acompanhar suas vendas.
                </p>
                <Button onClick={onNewContract} className="bg-emerald-500 hover:bg-emerald-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Contrato
                </Button>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-6">
                {/* Botão Adicionar Contrato - sempre visível */}
                <div className="flex justify-end">
                    <Button onClick={onNewContract} className="bg-emerald-500 hover:bg-emerald-600">
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Contrato
                    </Button>
                </div>

                {groupedContracts.map(group => (
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
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                    <Calendar className="w-4 h-4 text-emerald-500" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-text-primary capitalize">
                                        {group.monthYear}
                                    </h3>
                                    <p className="text-xs text-text-tertiary">
                                        {group.contracts.length} contrato{group.contracts.length !== 1 ? "s" : ""}
                                    </p>
                                </div>
                            </div>
                            <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                <span className="text-sm font-semibold text-emerald-400">
                                    {group.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                </span>
                            </div>
                        </div>

                        {/* Tabela do Grupo - condicional */}
                        {expandedMonths.has(group.monthYear) && (
                            <>
                                {/* Mobile Card View */}
                                <div className="md:hidden space-y-3">
                                    {group.contracts.map(contract => (
                                        <Card key={contract.id} className="bg-brand-card/50 border-white/[0.08]">
                                            <CardContent className="p-4 space-y-3">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-semibold text-text-primary">{contract.clientName}</h4>
                                                        <span className="text-xs text-text-tertiary font-mono">
                                                            {format(new Date(contract.contractDate), "dd/MM/yy")}
                                                        </span>
                                                    </div>
                                                    <span className="font-semibold text-emerald-400">
                                                        R$ {contract.totalValue.toFixed(2)}
                                                    </span>
                                                </div>

                                                <div className="flex flex-wrap gap-2 text-xs">
                                                    <span className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                        {PACKAGE_LABELS[contract.package]}
                                                    </span>
                                                    <span className="px-2 py-1 rounded-md bg-white/[0.05] text-text-secondary">
                                                        {SOURCE_LABELS[contract.source]}
                                                    </span>
                                                </div>

                                                <div className="flex justify-between items-center pt-2 border-t border-white/[0.06]">
                                                    <div className="space-y-0.5 text-xs">
                                                        <div className="text-text-secondary">{contract.whatsapp}</div>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 text-text-tertiary hover:text-red-400 hover:bg-red-500/10"
                                                        onClick={() => setDeleteId(contract.id)}
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
                                                <TableHead className="text-text-tertiary">Data</TableHead>
                                                <TableHead className="text-text-tertiary">Cliente</TableHead>
                                                <TableHead className="text-text-tertiary">Contatos</TableHead>
                                                <TableHead className="text-text-tertiary">Redes/Doc</TableHead>
                                                <TableHead className="text-text-tertiary">Origem</TableHead>
                                                <TableHead className="text-text-tertiary">Pacote</TableHead>
                                                <TableHead className="text-text-tertiary">Adicionais</TableHead>
                                                <TableHead className="text-text-tertiary">Declaração</TableHead>
                                                <TableHead className="text-text-tertiary text-right">Valor</TableHead>
                                                <TableHead className="text-text-tertiary w-12"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {group.contracts.map(contract => (
                                                <TableRow
                                                    key={contract.id}
                                                    className="border-white/[0.04] hover:bg-white/[0.02]"
                                                >
                                                    <TableCell className="font-mono text-sm">
                                                        {format(new Date(contract.contractDate), "dd/MM/yy")}
                                                    </TableCell>
                                                    <TableCell className="font-medium text-text-primary">
                                                        {contract.clientName}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="space-y-0.5 text-xs">
                                                            {contract.email && (
                                                                <div
                                                                    className="text-text-secondary truncate max-w-[200px] cursor-help"
                                                                    title={contract.email}
                                                                >
                                                                    {contract.email}
                                                                </div>
                                                            )}
                                                            <div className="text-text-tertiary font-mono">
                                                                {formatPhone(contract.whatsapp)}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="space-y-0.5 text-xs">
                                                            {contract.instagram && (
                                                                <div className="text-text-secondary">{contract.instagram}</div>
                                                            )}
                                                            {contract.cpf && (
                                                                <div className="text-text-tertiary font-mono">{contract.cpf}</div>
                                                            )}
                                                            {!contract.instagram && !contract.cpf && (
                                                                <span className="text-text-tertiary">-</span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="text-xs px-2 py-1 rounded-md bg-white/[0.05] text-text-secondary">
                                                            {SOURCE_LABELS[contract.source]}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="text-xs px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                            {PACKAGE_LABELS[contract.package]}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        {(() => {
                                                            // Filtrar addons inválidos (vazios, "00)", etc)
                                                            const validAddons = contract.addons.filter(
                                                                addon => addon && addon.trim() !== "" && addon !== "00)" && !addon.match(/^\d+\)$/)
                                                            );
                                                            return validAddons.length > 0 ? (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {validAddons.slice(0, 2).map(addon => (
                                                                        <span
                                                                            key={addon}
                                                                            className="text-xs px-1.5 py-0.5 rounded bg-white/[0.05] text-text-tertiary"
                                                                        >
                                                                            {ADDON_LABELS[addon] || addon}
                                                                        </span>
                                                                    ))}
                                                                    {validAddons.length > 2 && (
                                                                        <span className="text-xs px-1.5 py-0.5 rounded bg-white/[0.05] text-text-tertiary">
                                                                            +{validAddons.length - 2}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-text-tertiary text-xs">-</span>
                                                            );
                                                        })()}
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="text-xs text-text-secondary">
                                                            Aceito os Termos de Serviço
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <span className="font-semibold text-emerald-400">
                                                            R$ {contract.totalValue.toFixed(2)}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-text-tertiary hover:text-red-400 hover:bg-red-500/10"
                                                            onClick={() => setDeleteId(contract.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>

            {/* Dialog de confirmação de exclusão */}
            <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Contrato?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. O contrato será permanentemente removido do sistema.
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
