"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, User, Calendar, DollarSign, ShoppingBag, FileText } from "lucide-react";
import { PACKAGE_LABELS, ADDON_LABELS } from "@/lib/contract-constants";
import type { PessoaData } from "@/app/actions/pessoas";

interface CustomerDetailModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customer: PessoaData | null;
}

export function CustomerDetailModal({
    open,
    onOpenChange,
    customer,
}: CustomerDetailModalProps) {
    if (!customer) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-brand-accent/20 flex items-center justify-center">
                            <User className="h-5 w-5 text-brand-accent" />
                        </div>
                        <div>
                            <div className="text-xl">{customer.name}</div>
                            <Badge
                                variant="outline"
                                className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-normal mt-1"
                            >
                                Cliente Ativo
                            </Badge>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Informações Básicas */}
                    <section>
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                            Informações de Contato
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span className="font-mono text-sm">{customer.phone}</span>
                            </div>
                            {customer.email && (
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{customer.email}</span>
                                </div>
                            )}
                            {customer.cpf && (
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-mono text-sm">CPF: {customer.cpf}</span>
                                </div>
                            )}
                        </div>
                    </section>

                    <hr className="border-border" />

                    {/* Métricas */}
                    <section>
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                            Métricas
                        </h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-muted/50 rounded-lg p-3 text-center">
                                <DollarSign className="h-5 w-5 text-emerald-400 mx-auto mb-1" />
                                <div className="text-lg font-bold text-emerald-400">
                                    {customer.ltv.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                </div>
                                <div className="text-xs text-muted-foreground">LTV Total</div>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-3 text-center">
                                <ShoppingBag className="h-5 w-5 text-brand-accent mx-auto mb-1" />
                                <div className="text-lg font-bold">{customer.contractCount}</div>
                                <div className="text-xs text-muted-foreground">Compras</div>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-3 text-center">
                                <Calendar className="h-5 w-5 text-purple-400 mx-auto mb-1" />
                                <div className="text-lg font-bold">
                                    {new Date(customer.lastContractDate).toLocaleDateString("pt-BR")}
                                </div>
                                <div className="text-xs text-muted-foreground">Última Compra</div>
                            </div>
                        </div>
                    </section>

                    <hr className="border-border" />

                    {/* Histórico de Compras */}
                    <section>
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                            Histórico de Compras
                        </h3>
                        <div className="space-y-3">
                            {customer.contracts.map((contract) => (
                                <div
                                    key={contract.id}
                                    className="bg-muted/30 rounded-lg p-3 border border-border"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm text-muted-foreground">
                                            {new Date(contract.contractDate).toLocaleDateString("pt-BR")}
                                        </span>
                                        <span className="text-emerald-400 font-semibold">
                                            {contract.totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                        </span>
                                    </div>
                                    <div className="font-medium">
                                        {PACKAGE_LABELS[contract.package as keyof typeof PACKAGE_LABELS] || contract.package}
                                    </div>
                                    {contract.addons.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {contract.addons.map((addon, i) => (
                                                <Badge key={i} variant="secondary" className="text-xs">
                                                    + {ADDON_LABELS[addon] || addon}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>

                    <hr className="border-border" />

                    {/* Observações */}
                    <section>
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                            Observações
                        </h3>
                        <div className="bg-muted/30 rounded-lg p-3 border border-border">
                            <pre className="text-sm whitespace-pre-wrap font-sans text-muted-foreground">
                                {customer.observacoes || "Nenhuma observação."}
                            </pre>
                        </div>
                    </section>
                </div>
            </DialogContent>
        </Dialog>
    );
}
