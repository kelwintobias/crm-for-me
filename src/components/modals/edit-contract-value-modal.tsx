"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateContractValue } from "@/app/actions/contracts";
import { toast } from "sonner";
import { Loader2, DollarSign } from "lucide-react";

interface PlainContract {
    id: string;
    clientName: string;
    totalValue: number;
}

interface EditContractValueModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    contract: PlainContract | null;
}

export function EditContractValueModal({ open, onOpenChange, contract }: EditContractValueModalProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [value, setValue] = useState("");

    // Initialize value when contract changes or modal opens
    useEffect(() => {
        if (contract) {
            setValue(contract.totalValue.toString());
        }
    }, [contract, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!contract) return;

        const numericValue = parseFloat(value.replace(",", "."));
        if (isNaN(numericValue) || numericValue < 0) {
            toast.error("Por favor, insira um valor válido");
            return;
        }

        setLoading(true);

        const result = await updateContractValue(contract.id, numericValue);

        setLoading(false);

        if (result.success) {
            toast.success("Valor atualizado com sucesso");
            onOpenChange(false);
            router.refresh();
        } else {
            toast.error(result.error || "Erro ao atualizar valor");
        }
    };

    if (!contract) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md bg-brand-card border-white/[0.08]">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                            <DialogTitle className="font-display text-xl">Editar Valor</DialogTitle>
                            <DialogDescription className="text-text-secondary">
                                Ajuste o valor total do contrato de <span className="text-emerald-400 font-semibold">{contract.clientName}</span>
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 mt-2">
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-text-secondary">
                            Novo Valor Total (R$)
                        </Label>
                        <Input
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder="0.00"
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            disabled={loading}
                            className="h-11 bg-white/[0.03] border-white/10 font-mono text-lg"
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-emerald-500 hover:bg-emerald-600"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                "Salvar Alterações"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
