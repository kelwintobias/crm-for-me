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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createLead } from "@/app/actions/leads";
import { toast } from "sonner";
import { Loader2, UserPlus, Sparkles, Columns3 } from "lucide-react";
import type { LeadSource, PipelineStage } from "@prisma/client";

// Validação de telefone brasileiro (10-11 dígitos)
function validatePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 0) return null;
  if (digits.length < 10) return "Telefone muito curto (min. 10 digitos)";
  if (digits.length > 11) return "Telefone muito longo (max. 11 digitos)";
  return null;
}

interface NewLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function NewLeadModal({ open, onOpenChange, onSuccess }: NewLeadModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<LeadSource>("INSTAGRAM");
  const [stage, setStage] = useState<PipelineStage>("NOVO_LEAD");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, "");
    setPhone(digits);
    setPhoneError(validatePhone(digits));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("source", source);
    formData.set("stage", stage);

    const result = await createLead(formData);

    setLoading(false);

    if (result.success) {
      toast.success("Lead criado com sucesso!", {
        description: "O lead foi adicionado ao pipeline.",
      });
      onOpenChange(false);
      (e.target as HTMLFormElement).reset();
      setSource("INSTAGRAM");
      setStage("NOVO_LEAD");
      setPhone("");
      setPhoneError(null);
      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
    } else {
      toast.error(result.error || "Erro ao criar lead");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-brand-card border-white/[0.08] shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-brand-accent" />
            </div>
            <div>
              <DialogTitle className="font-display text-xl">Novo Lead</DialogTitle>
              <DialogDescription className="text-text-secondary">
                Adicione um novo lead ao pipeline
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="relative space-y-5 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-text-secondary flex items-center gap-2">
              Nome
              <span className="text-brand-accent">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              placeholder="Nome do cliente"
              required
              disabled={loading}
              className="h-11 bg-white/[0.03] border-white/10 focus:border-brand-accent/50 input-glow transition-all"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium text-text-secondary flex items-center gap-2">
              Telefone
              <span className="text-brand-accent">*</span>
            </Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="11999999999"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              required
              disabled={loading}
              inputMode="numeric"
              className={`h-11 bg-white/[0.03] focus:border-brand-accent/50 input-glow font-mono transition-all ${phoneError
                ? "border-red-500/50 focus:border-red-500"
                : phone.length >= 10
                  ? "border-emerald-500/50"
                  : "border-white/10"
                }`}
            />
            {phoneError ? (
              <p className="text-xs text-red-400">{phoneError}</p>
            ) : (
              <p className="text-xs text-text-tertiary">
                Apenas numeros (DDD + numero)
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="source" className="text-sm font-medium text-text-secondary flex items-center gap-2">
                Origem
                <span className="text-brand-accent">*</span>
              </Label>
              <Select value={source} onValueChange={(v) => setSource(v as LeadSource)}>
                <SelectTrigger className="h-11 bg-white/[0.03] border-white/10 focus:border-brand-accent/50">
                  <SelectValue placeholder="Selecione a origem" />
                </SelectTrigger>
                <SelectContent className="glass-strong border-white/10">
                  <SelectItem value="INSTAGRAM" className="focus:bg-brand-accent/20">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500" />
                      Instagram
                    </span>
                  </SelectItem>
                  <SelectItem value="INDICACAO" className="focus:bg-brand-accent/20">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Indicação
                    </span>
                  </SelectItem>
                  <SelectItem value="PAGINA_PARCEIRA" className="focus:bg-brand-accent/20">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-500" />
                      Página Parceira
                    </span>
                  </SelectItem>
                  <SelectItem value="INFLUENCER" className="focus:bg-brand-accent/20">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-violet-500" />
                      Influenciador
                    </span>
                  </SelectItem>
                  <SelectItem value="ANUNCIO" className="focus:bg-brand-accent/20">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Anúncio
                    </span>
                  </SelectItem>
                  <SelectItem value="OUTRO" className="focus:bg-brand-accent/20">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-gray-500" />
                      Outro
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stage" className="text-sm font-medium text-text-secondary flex items-center gap-2">
                <Columns3 className="w-3.5 h-3.5" />
                Coluna
              </Label>
              <Select value={stage} onValueChange={(v) => setStage(v as PipelineStage)}>
                <SelectTrigger className="h-11 bg-white/[0.03] border-white/10 focus:border-brand-accent/50">
                  <SelectValue placeholder="Selecione a coluna" />
                </SelectTrigger>
                <SelectContent className="glass-strong border-white/10">
                  <SelectItem value="NOVO_LEAD" className="focus:bg-brand-accent/20">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      Novo Lead
                    </span>
                  </SelectItem>
                  <SelectItem value="EM_NEGOCIACAO" className="focus:bg-brand-accent/20">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Em Negociação
                    </span>
                  </SelectItem>
                  <SelectItem value="AGENDADO" className="focus:bg-brand-accent/20">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-violet-500" />
                      Agendado
                    </span>
                  </SelectItem>
                  <SelectItem value="EM_ATENDIMENTO" className="focus:bg-brand-accent/20">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-500" />
                      Em Atendimento
                    </span>
                  </SelectItem>
                  <SelectItem value="POS_VENDA" className="focus:bg-brand-accent/20">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      Pós-Venda
                    </span>
                  </SelectItem>
                  <SelectItem value="FINALIZADO" className="focus:bg-brand-accent/20">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Finalizado
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.06]">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="hover:bg-white/[0.05]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !!phoneError || phone.length < 10}
              className="bg-brand-accent hover:bg-brand-accent/90 text-text-dark font-semibold shadow-glow hover:shadow-glow-lg transition-all duration-300 group gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 group-hover:rotate-12 transition-transform" />
                  Criar Lead
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
