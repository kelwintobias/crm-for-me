"use client";

import { useState } from "react";
import { useDataRefresh } from "@/hooks/use-data-refresh";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { createFixedCost } from "@/app/actions/fixed-costs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

interface NewFixedCostModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const COST_TYPES = [
    { value: "Despesa", label: "Despesa" },
    { value: "Investimento", label: "Investimento" },
    { value: "Assinatura", label: "Assinatura" },
];

const CATEGORIES = [
    { value: "automação de mensagens", label: "Automação de Mensagens" },
    { value: "Verificado instagram", label: "Verificado Instagram" },
    { value: "Gestor de Tráfego", label: "Gestor de Tráfego" },
    { value: "Funcionario instagram/Post", label: "Funcionário Instagram/Post" },
    { value: "Season Cloud/Site", label: "Season Cloud/Site" },
    { value: "Banners, imagens", label: "Banners, Imagens" },
    { value: "Marketing", label: "Marketing" },
    { value: "Ferramentas", label: "Ferramentas" },
    { value: "Infraestrutura", label: "Infraestrutura" },
    { value: "Outros", label: "Outros" },
];

export function NewFixedCostModal({ open, onOpenChange }: NewFixedCostModalProps) {
    const { refreshFixedCosts } = useDataRefresh();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        date: format(new Date(), "yyyy-MM-dd"),
        type: "Despesa",
        category: "",
        description: "",
        value: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const valueNumber = parseFloat(formData.value.replace(",", "."));

            if (isNaN(valueNumber) || valueNumber < 0) {
                toast.error("Valor inválido");
                setIsLoading(false);
                return;
            }

            const result = await createFixedCost({
                date: formData.date,
                type: formData.type,
                category: formData.category,
                description: formData.description,
                value: valueNumber,
            });

            if (result.success) {
                toast.success("Custo fixo adicionado com sucesso!");
                onOpenChange(false);
                refreshFixedCosts();
                // Reset form
                setFormData({
                    date: format(new Date(), "yyyy-MM-dd"),
                    type: "Despesa",
                    category: "",
                    description: "",
                    value: "",
                });
            } else {
                toast.error(result.error || "Erro ao adicionar custo fixo");
            }
        } catch {
            toast.error("Erro ao adicionar custo fixo");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Adicionar Custo Fixo</DialogTitle>
                    <DialogDescription>
                        Cadastre uma nova despesa ou custo fixo mensal.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        {/* Data */}
                        <div className="space-y-2">
                            <Label htmlFor="date">Data</Label>
                            <Input
                                id="date"
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                required
                            />
                        </div>

                        {/* Tipo */}
                        <div className="space-y-2">
                            <Label htmlFor="type">Tipo</Label>
                            <Select
                                value={formData.type}
                                onValueChange={(value) => setFormData({ ...formData, type: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    {COST_TYPES.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                            {type.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Categoria */}
                    <div className="space-y-2">
                        <Label htmlFor="category">Categoria</Label>
                        <Select
                            value={formData.category}
                            onValueChange={(value) => setFormData({ ...formData, category: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione a categoria" />
                            </SelectTrigger>
                            <SelectContent>
                                {CATEGORIES.map((cat) => (
                                    <SelectItem key={cat.value} value={cat.value}>
                                        {cat.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Descrição */}
                    <div className="space-y-2">
                        <Label htmlFor="description">Descrição</Label>
                        <Input
                            id="description"
                            placeholder="Ex: Manychat, Bot Conversa..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            required
                        />
                    </div>

                    {/* Valor */}
                    <div className="space-y-2">
                        <Label htmlFor="value">Valor (R$)</Label>
                        <Input
                            id="value"
                            placeholder="0,00"
                            value={formData.value}
                            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                            required
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="bg-orange-500 hover:bg-orange-600"
                            disabled={isLoading || !formData.category || !formData.description}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                "Adicionar Custo"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
