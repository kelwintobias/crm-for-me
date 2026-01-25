"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, User, Calendar, DollarSign, ShoppingBag, FileText, Lock, Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PACKAGE_LABELS, ADDON_LABELS } from "@/lib/contract-constants";
import type { PessoaData } from "@/app/actions/pessoas";
import { updatePessoa } from "@/app/actions/pessoas";

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
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Estados do formulário
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        email: "",
        cpf: "",
        observacoes: "",
    });

    // Carregar dados quando o modal abre ou cliente muda
    useEffect(() => {
        if (customer) {
            setFormData({
                name: customer.name,
                phone: customer.phone,
                email: customer.email || "",
                cpf: customer.cpf || "",
                observacoes: customer.observacoes || "",
            });
            setIsEditing(false); // Resetar modo edição ao abrir
        }
    }, [customer, open]);

    if (!customer) return null;

    async function handleSave() {
        setIsLoading(true);
        try {
            const result = await updatePessoa(customer!.id, {
                ...formData,
                leadId: customer!.leadId,
            });

            if (result.success) {
                setIsEditing(false);
                // Feedback visual simples se não tiver toast
                alert("Dados atualizados com sucesso!");
                onOpenChange(false);
            } else {
                alert("Erro ao atualizar dados.");
            }
        } catch (error) {
            console.error("Erro ao salvar:", error);
            alert("Ocorreu um erro ao salvar.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-full max-w-full h-[100dvh] md:w-auto md:max-w-2xl md:h-auto md:max-h-[85vh] overflow-y-auto rounded-none md:rounded-lg">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-brand-accent/20 flex items-center justify-center">
                                <User className="h-5 w-5 text-brand-accent" />
                            </div>
                            <div>
                                <div className="text-xl">
                                    {isEditing ? (
                                        <Input
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="h-8 text-lg font-semibold"
                                        />
                                    ) : (
                                        customer.name
                                    )}
                                </div>
                                <Badge
                                    variant="outline"
                                    className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-normal mt-1"
                                >
                                    Cliente Ativo
                                </Badge>
                            </div>
                        </DialogTitle>

                        <div className="pr-8">
                            {!isEditing ? (
                                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Editar
                                </Button>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={isLoading}>
                                        <X className="h-4 w-4 mr-2" />
                                        Cancelar
                                    </Button>
                                    <Button size="sm" onClick={handleSave} disabled={isLoading}>
                                        <Save className="h-4 w-4 mr-2" />
                                        Salvar
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Informações Básicas */}
                    <section>
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                            Informações de Contato
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Phone className="h-4 w-4" />
                                    <span className="text-xs font-medium uppercase">Telefone</span>
                                </div>
                                {isEditing ? (
                                    <Input
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                ) : (
                                    <span className="font-mono text-sm pl-6">{customer.phone}</span>
                                )}
                            </div>

                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Mail className="h-4 w-4" />
                                    <span className="text-xs font-medium uppercase">Email</span>
                                </div>
                                {isEditing ? (
                                    <Input
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                ) : (
                                    <span className="text-sm pl-6">{customer.email || "-"}</span>
                                )}
                            </div>

                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <FileText className="h-4 w-4" />
                                    <span className="text-xs font-medium uppercase">CPF</span>
                                </div>
                                {isEditing ? (
                                    <Input
                                        value={formData.cpf}
                                        onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                                    />
                                ) : (
                                    <span className="font-mono text-sm pl-6">{customer.cpf || "-"}</span>
                                )}
                            </div>
                        </div>
                    </section>

                    <hr className="border-border" />

                    {/* Observações - TOTALMENTE EDITÁVEL E SINCRONIZADA */}
                    <section>
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                            Observações (Lead)
                            <span title="Sincronizado com o Lead no Kanban" className="flex items-center cursor-help">
                                <Lock className="h-3 w-3 text-muted-foreground/50" />
                            </span>
                        </h3>
                        {isEditing ? (
                            <Textarea
                                value={formData.observacoes}
                                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                                className="min-h-[100px]"
                                placeholder="Anote aqui informações importantes..."
                            />
                        ) : (
                            <div className="bg-muted/30 rounded-lg p-3 border border-border min-h-[60px]">
                                <pre className="text-sm whitespace-pre-wrap font-sans text-muted-foreground">
                                    {customer.observacoes || "Nenhuma observação cadastrada."}
                                </pre>
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                            * Essas observações são sincronizadas com o cartão do Lead no Kanban.
                        </p>
                    </section>

                    <hr className="border-border" />

                    {/* Métricas (Somente Leitura) */}
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
                                    {customer.lastContractDate ? new Date(customer.lastContractDate).toLocaleDateString("pt-BR") : "-"}
                                </div>
                                <div className="text-xs text-muted-foreground">Última Compra</div>
                            </div>
                        </div>
                    </section>

                    <hr className="border-border" />

                    {/* Histórico de Compras (Gerado Automaticamente - Somente Leitura) */}
                    <section>
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                            Histórico de Compras
                        </h3>
                        <div className="bg-muted/10 rounded-lg p-3 border border-border mb-4">
                            <pre className="text-sm whitespace-pre-wrap font-sans text-muted-foreground">
                                {customer.purchaseHistoryText}
                            </pre>
                        </div>

                        {/* Detalhe dos cartões (visual opcional, mas mantido pra beleza) */}
                        <div className="space-y-3 opacity-80">
                            <div className="text-xs text-muted-foreground uppercase font-bold mb-2">Detalhes dos Contratos</div>
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
                </div>
            </DialogContent>
        </Dialog>
    );
}
