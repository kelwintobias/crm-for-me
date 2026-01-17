"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingBag, Clock, MessageSquare } from "lucide-react";
import { getServiceHistory, type ServiceHistoryItem } from "@/app/actions/pessoas";
import { PACKAGE_LABELS } from "@/lib/contract-constants";

interface Contract {
    id: string;
    contractDate: string;
    package: string;
    addons: string[];
    totalValue: number;
}

interface PurchaseJourneyModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    leadId: string;
    leadName: string;
    contracts: Contract[];
    ltv: number;
}

export function PurchaseJourneyModal({
    open,
    onOpenChange,
    leadId,
    leadName,
    contracts,
    ltv,
}: PurchaseJourneyModalProps) {
    const [activeTab, setActiveTab] = useState("jornada");
    const [serviceHistory, setServiceHistory] = useState<ServiceHistoryItem[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        if (open && activeTab === "historico") {
            setLoadingHistory(true);
            getServiceHistory(leadId)
                .then(setServiceHistory)
                .catch(console.error)
                .finally(() => setLoadingHistory(false));
        }
    }, [open, activeTab, leadId]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span>{leadName}</span>
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                            LTV: {ltv.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </Badge>
                    </DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="jornada" className="gap-2">
                            <ShoppingBag className="h-4 w-4" />
                            Jornada de Compras
                        </TabsTrigger>
                        <TabsTrigger value="historico" className="gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Histórico de Atendimento
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="jornada" className="mt-4">
                        {contracts.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                Nenhuma compra registrada.
                            </div>
                        ) : (
                            <div className="relative">
                                {/* Timeline line */}
                                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

                                <div className="space-y-6">
                                    {contracts.map((contract, index) => (
                                        <div key={contract.id} className="relative pl-10">
                                            {/* Timeline dot */}
                                            <div className="absolute left-2.5 w-3 h-3 rounded-full bg-brand-accent border-2 border-background" />

                                            <div className="bg-muted/50 rounded-lg p-4 border border-border">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <Clock className="h-4 w-4" />
                                                        {new Date(contract.contractDate).toLocaleDateString("pt-BR", {
                                                            day: "2-digit",
                                                            month: "2-digit",
                                                            year: "numeric",
                                                        })}
                                                    </div>
                                                    <span className="text-emerald-400 font-semibold">
                                                        {contract.totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                                    </span>
                                                </div>

                                                <div className="font-medium">
                                                    Pacote {PACKAGE_LABELS[contract.package as keyof typeof PACKAGE_LABELS] || contract.package}
                                                </div>

                                                {contract.addons.length > 0 && (
                                                    <div className="mt-2 flex flex-wrap gap-1">
                                                        {contract.addons.map((addon, i) => (
                                                            <Badge key={i} variant="secondary" className="text-xs">
                                                                + {addon}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="historico" className="mt-4">
                        {loadingHistory ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <Skeleton key={i} className="h-16 w-full" />
                                ))}
                            </div>
                        ) : serviceHistory.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                Nenhum histórico de atendimento.
                            </div>
                        ) : (
                            <div className="relative">
                                {/* Timeline line */}
                                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

                                <div className="space-y-4">
                                    {serviceHistory.map((item) => (
                                        <div key={item.id} className="relative pl-10">
                                            {/* Timeline dot */}
                                            <div className="absolute left-2.5 w-3 h-3 rounded-full bg-purple-500 border-2 border-background" />

                                            <div className="bg-muted/30 rounded-lg p-3 border border-border">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-muted-foreground">
                                                        {new Date(item.date).toLocaleDateString("pt-BR", {
                                                            day: "2-digit",
                                                            month: "2-digit",
                                                            year: "numeric",
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                        })}
                                                    </span>
                                                    {item.userName && (
                                                        <Badge variant="outline" className="text-xs">
                                                            {item.userName}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="mt-1 font-medium">{item.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
