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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn, formatPhone } from "@/lib/utils";
import type { ContractSource, ContractPackage } from "@prisma/client";
import { EditContractValueModal } from "@/components/modals/edit-contract-value-modal";
import {
    FileText,
    Trash2,
    Loader2,
    Calendar,
    Plus,
    ChevronRight,
    Pencil,
    Instagram,
    MessageCircle,
} from "lucide-react";

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

    // State for editing value
    const [editingContract, setEditingContract] = useState<PlainContract | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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
            refreshContracts();
        } else {
            toast.error(result.error || "Erro ao excluir contrato");
        }

        setDeleteId(null);
    };

    const handleEditValue = (contract: PlainContract) => {
        setEditingContract(contract);
        setIsEditModalOpen(true);
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
                {groupedContracts.map((group) => (
                    <div key={group.monthYear} className="space-y-4">
                        <button
                            onClick={() => toggleMonth(group.monthYear)}
                            className="flex items-center gap-2 text-text-primary hover:text-emerald-400 transition-colors group"
                        >
                            <div className={cn(
                                "p-1 rounded-md bg-white/[0.03] border border-white/10 transition-transform duration-200",
                                expandedMonths.has(group.monthYear) ? "rotate-90" : ""
                            )}>
                                <ChevronRight className="w-4 h-4" />
                            </div>
                            <span className="text-lg font-semibold capitalize">
                                {group.monthYear}
                            </span>
                            <span className="text-sm text-text-tertiary font-mono bg-white/[0.03] px-2 py-0.5 rounded border border-white/[0.06]">
                                {group.contracts.length}
                            </span>
                            <div className="flex-1 h-px bg-white/[0.06] group-hover:bg-emerald-500/20 transition-colors" />
                            <span className="text-emerald-500 font-mono font-medium">
                                R$ {group.total.toFixed(2)}
                            </span>
                        </button>

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
                                                    <div className="text-right">
                                                        <span className="font-semibold text-emerald-400 block">
                                                            R$ {contract.totalValue.toFixed(2)}
                                                        </span>
                                                        <button
                                                            onClick={() => handleEditValue(contract)}
                                                            className="text-xs text-emerald-500 hover:text-emerald-400 underline mt-1"
                                                        >
                                                            Editar
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2 text-sm">
                                                    <div>
                                                        <span className="text-xs text-text-tertiary block">Pacote</span>
                                                        <span className="text-text-secondary">
                                                            {PACKAGE_LABELS[contract.package]}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-xs text-text-tertiary block">Origem</span>
                                                        <span className="text-text-secondary">
                                                            {SOURCE_LABELS[contract.source]}
                                                        </span>
                                                    </div>
                                                </div>

                                                {contract.addons.length > 0 && (
                                                    <div>
                                                        <span className="text-xs text-text-tertiary block mb-1">Adicionais</span>
                                                        <div className="flex flex-wrap gap-1">
                                                            {contract.addons.map(addon => (
                                                                <span
                                                                    key={addon}
                                                                    className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                                                >
                                                                    {ADDON_LABELS[addon] || addon}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex justify-between items-center pt-2 border-t border-white/[0.06]">
                                                    <div className="space-y-0.5 text-xs">
                                                        <div className="flex items-center gap-1.5 text-text-secondary">
                                                            <MessageCircle className="w-3 h-3 text-emerald-500" />
                                                            {formatPhone(contract.whatsapp)}
                                                        </div>
                                                        {contract.instagram && (
                                                            <div className="flex items-center gap-1.5 text-text-secondary">
                                                                <Instagram className="w-3 h-3 text-pink-500" />
                                                                {contract.instagram}
                                                            </div>
                                                        )}
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
                                                <TableHead className="text-text-tertiary w-20"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {group.contracts.map(contract => (
                                                <TableRow
                                                    key={contract.id}
                                                    className="border-white/[0.04] hover:bg-white/[0.02]"
                                                >
                                                    <TableCell className="font-mono text-text-secondary">
                                                        {format(new Date(contract.contractDate), "dd/MM/yy")}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-medium text-text-primary">
                                                            {contract.clientName}
                                                        </div>
                                                        {contract.email && (
                                                            <div className="text-xs text-text-tertiary">
                                                                {contract.email}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="space-y-1">
                                                            <div className="text-xs text-text-secondary flex items-center gap-1.5">
                                                                <MessageCircle className="w-3 h-3 text-emerald-500" />
                                                                {formatPhone(contract.whatsapp)}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="space-y-1">
                                                            {contract.instagram && (
                                                                <div className="text-xs text-text-secondary flex items-center gap-1.5">
                                                                    <Instagram className="w-3 h-3 text-pink-500" />
                                                                    {contract.instagram}
                                                                </div>
                                                            )}
                                                            {contract.cpf && (
                                                                <div className="text-xs text-text-tertiary font-mono">
                                                                    {contract.cpf}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-white/[0.03] text-text-secondary border border-white/[0.06]">
                                                            {SOURCE_LABELS[contract.source]}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="text-sm text-text-primary">
                                                            {PACKAGE_LABELS[contract.package]}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                            {contract.addons.map(addon => (
                                                                <span
                                                                    key={addon}
                                                                    className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap"
                                                                >
                                                                    {ADDON_LABELS[addon] || addon}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-1.5">
                                                            <div className={cn(
                                                                "w-2 h-2 rounded-full",
                                                                contract.termsAccepted ? "bg-emerald-500" : "bg-red-500"
                                                            )} />
                                                            <span className="text-xs text-text-secondary">
                                                                {contract.termsAccepted ? "Aceito" : "Pendente"}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right group relative">
                                                        <span className="font-semibold text-emerald-400">
                                                            R$ {contract.totalValue.toFixed(2)}
                                                        </span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-text-tertiary hover:text-emerald-400"
                                                            onClick={() => handleEditValue(contract)}
                                                            title="Editar valor"
                                                        >
                                                            <Pencil className="w-3 h-3" />
                                                        </Button>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex justify-end">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-text-tertiary hover:text-red-400 hover:bg-red-500/10"
                                                                onClick={() => setDeleteId(contract.id)}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
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

            <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent className="bg-brand-card border-white/10">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir contrato?</AlertDialogTitle>
                        <AlertDialogDescription className="text-text-secondary">
                            Esta ação não pode ser desfeita. O contrato será permanentemente removido.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="border-white/10 hover:bg-white/5 hover:text-text-primary">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-500 hover:bg-red-600 text-white border-0"
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Excluindo...
                                </>
                            ) : (
                                "Excluir"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <EditContractValueModal
                open={isEditModalOpen}
                onOpenChange={setIsEditModalOpen}
                contract={editingContract}
            />
        </>
    );
}
