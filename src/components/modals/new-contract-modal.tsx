"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { createContract } from "@/app/actions/contracts";
import { toast } from "sonner";
import {
    Loader2,
    FileText,
    Calendar as CalendarIcon,
    DollarSign,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

// Tipos locais (sem imports do Prisma para evitar problemas)
type ContractSourceType = "ANUNCIO" | "INDICACAO" | "INFLUENCIADOR" | "PARCEIRO";
type ContractPackageType = "INTERMEDIARIO" | "AVANCADO" | "ELITE" | "PRO_PLUS" | "ULTRA_PRO" | "EVOLUTION";

// Preços
const PACKAGE_PRICES: Record<ContractPackageType, number> = {
    INTERMEDIARIO: 25.00,
    AVANCADO: 40.00,
    ELITE: 50.00,
    PRO_PLUS: 75.00,
    ULTRA_PRO: 100.00,
    EVOLUTION: 150.00,
};

const PACKAGE_OPTIONS: { value: ContractPackageType; label: string; price: number }[] = [
    { value: "INTERMEDIARIO", label: "Intermediário", price: 25.00 },
    { value: "AVANCADO", label: "Avançado", price: 40.00 },
    { value: "ELITE", label: "Elite", price: 50.00 },
    { value: "PRO_PLUS", label: "Pro Plus", price: 75.00 },
    { value: "ULTRA_PRO", label: "Ultra Pro", price: 100.00 },
    { value: "EVOLUTION", label: "Evolution", price: 150.00 },
];

const SOURCE_OPTIONS: { value: ContractSourceType; label: string }[] = [
    { value: "ANUNCIO", label: "Anúncio" },
    { value: "INDICACAO", label: "Indicação" },
    { value: "INFLUENCIADOR", label: "Influenciador" },
    { value: "PARCEIRO", label: "Parceiro" },
];

const ADDON_OPTIONS = [
    { id: "ATIVACAO_WINDOWS", label: "Ativação do Windows", price: 19.90 },
    { id: "UPBOOST_PLUS", label: "UPBOOST+", price: 29.90 },
    { id: "REMOCAO_DELAY", label: "Remoção Delay", price: 35.90 },
    { id: "FORMATACAO_PADRAO", label: "Formatação Padrão", price: 59.90 },
    { id: "FORMATACAO_PROFISSIONAL", label: "Formatação Profissional", price: 99.90 },
];

interface NewContractModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function NewContractModal({ open, onOpenChange, onSuccess }: NewContractModalProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Form state
    const [clientName, setClientName] = useState("");
    const [email, setEmail] = useState("");
    const [whatsapp, setWhatsapp] = useState("");
    const [instagram, setInstagram] = useState("");
    const [cpf, setCpf] = useState("");
    const [contractDate, setContractDate] = useState<Date | undefined>(new Date());
    const [source, setSource] = useState<ContractSourceType>("ANUNCIO");
    const [selectedPackage, setSelectedPackage] = useState<ContractPackageType>("INTERMEDIARIO");
    const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

    // Calcular valor total
    const packagePrice = PACKAGE_PRICES[selectedPackage];
    const addonsPrice = selectedAddons.reduce((sum, addonId) => {
        const addon = ADDON_OPTIONS.find(a => a.id === addonId);
        return sum + (addon?.price || 0);
    }, 0);
    const totalValue = packagePrice + addonsPrice;

    const toggleAddon = (addonId: string) => {
        setSelectedAddons(prev =>
            prev.includes(addonId)
                ? prev.filter(id => id !== addonId)
                : [...prev, addonId]
        );
    };

    const resetForm = () => {
        setClientName("");
        setEmail("");
        setWhatsapp("");
        setInstagram("");
        setCpf("");
        setContractDate(new Date());
        setSource("ANUNCIO");
        setSelectedPackage("INTERMEDIARIO");
        setSelectedAddons([]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!contractDate) {
            toast.error("Selecione a data do contrato");
            return;
        }

        if (whatsapp.replace(/\D/g, "").length < 10) {
            toast.error("WhatsApp deve ter pelo menos 10 dígitos");
            return;
        }

        setLoading(true);

        const result = await createContract({
            clientName,
            email: email || undefined,
            whatsapp,
            instagram: instagram || undefined,
            cpf: cpf || undefined,
            contractDate: contractDate.toISOString(),
            source,
            package: selectedPackage,
            addons: selectedAddons,
            termsAccepted: true,
        });

        setLoading(false);

        if (result.success) {
            toast.success("Contrato criado com sucesso!", {
                description: `Valor total: R$ ${totalValue.toFixed(2)}`,
            });
            resetForm();
            onOpenChange(false);
            if (onSuccess) {
                onSuccess();
            } else {
                router.refresh();
            }
        } else {
            toast.error(result.error || "Erro ao criar contrato");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-brand-card border-white/[0.08]">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                            <DialogTitle className="font-display text-xl">Novo Contrato</DialogTitle>
                            <DialogDescription className="text-text-secondary">
                                Cadastre um novo contrato no sistema
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                    {/* Data do Contrato */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-text-secondary flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4" />
                            Data do Contrato
                            <span className="text-brand-accent">*</span>
                        </Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className={cn(
                                        "w-full justify-start text-left font-normal h-11 bg-white/[0.03] border-white/10",
                                        !contractDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {contractDate ? format(contractDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={contractDate}
                                    onSelect={setContractDate}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Nome do Cliente */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-text-secondary">
                            Nome do Cliente
                            <span className="text-brand-accent ml-1">*</span>
                        </Label>
                        <Input
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            placeholder="Nome completo"
                            required
                            disabled={loading}
                            className="h-11 bg-white/[0.03] border-white/10"
                        />
                    </div>

                    {/* Contatos: Email e WhatsApp */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-text-secondary">E-mail</Label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="email@exemplo.com"
                                disabled={loading}
                                className="h-11 bg-white/[0.03] border-white/10"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-text-secondary">
                                WhatsApp
                                <span className="text-brand-accent ml-1">*</span>
                            </Label>
                            <Input
                                value={whatsapp}
                                onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ""))}
                                placeholder="11999999999"
                                required
                                disabled={loading}
                                inputMode="numeric"
                                className="h-11 bg-white/[0.03] border-white/10 font-mono"
                            />
                        </div>
                    </div>

                    {/* Redes/Doc: Instagram e CPF */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-text-secondary">Instagram</Label>
                            <Input
                                value={instagram}
                                onChange={(e) => setInstagram(e.target.value)}
                                placeholder="@usuario"
                                disabled={loading}
                                className="h-11 bg-white/[0.03] border-white/10"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-text-secondary">CPF</Label>
                            <Input
                                value={cpf}
                                onChange={(e) => setCpf(e.target.value)}
                                placeholder="000.000.000-00"
                                disabled={loading}
                                className="h-11 bg-white/[0.03] border-white/10 font-mono"
                            />
                        </div>
                    </div>

                    {/* Origem - usando select HTML nativo */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-text-secondary">
                                Origem
                                <span className="text-brand-accent ml-1">*</span>
                            </Label>
                            <select
                                value={source}
                                onChange={(e) => setSource(e.target.value as ContractSourceType)}
                                className="w-full h-11 px-3 rounded-md bg-white/[0.03] border border-white/10 text-text-primary"
                                disabled={loading}
                            >
                                {SOURCE_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value} className="bg-brand-card">
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-text-secondary">
                                Pacote
                                <span className="text-brand-accent ml-1">*</span>
                            </Label>
                            <select
                                value={selectedPackage}
                                onChange={(e) => setSelectedPackage(e.target.value as ContractPackageType)}
                                className="w-full h-11 px-3 rounded-md bg-white/[0.03] border border-white/10 text-text-primary"
                                disabled={loading}
                            >
                                {PACKAGE_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value} className="bg-brand-card">
                                        {opt.label} - R$ {opt.price.toFixed(2)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Adicionais */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium text-text-secondary">Adicionais</Label>
                        <div className="grid grid-cols-1 gap-2">
                            {ADDON_OPTIONS.map(addon => (
                                <label
                                    key={addon.id}
                                    className={cn(
                                        "flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer",
                                        selectedAddons.includes(addon.id)
                                            ? "bg-emerald-500/10 border-emerald-500/30"
                                            : "bg-white/[0.02] border-white/[0.06] hover:border-white/10"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedAddons.includes(addon.id)}
                                            onChange={() => toggleAddon(addon.id)}
                                            className="w-4 h-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500"
                                        />
                                        <span className="text-text-primary">{addon.label}</span>
                                    </div>
                                    <span className="text-emerald-400 font-mono text-sm">
                                        + R$ {addon.price.toFixed(2)}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Valor Total */}
                    <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-brand-accent/10 border border-emerald-500/20">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-emerald-400" />
                                <span className="text-text-secondary font-medium">Valor Total</span>
                            </div>
                            <span className="text-2xl font-bold text-emerald-400">
                                R$ {totalValue.toFixed(2)}
                            </span>
                        </div>
                    </div>

                    {/* Botões */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.06]">
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
                            disabled={loading || !clientName || !whatsapp}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <FileText className="h-4 w-4 mr-2" />
                                    Criar Contrato
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
