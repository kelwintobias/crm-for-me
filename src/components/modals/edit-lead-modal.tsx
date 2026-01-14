"use client";

import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateLead, deleteLead } from "@/app/actions/leads";
import { toast } from "sonner";
import { Loader2, Trash2, ExternalLink, Edit3, Save, MessageCircle } from "lucide-react";
import type { LeadSource, PlanType } from "@prisma/client";
import { getWhatsAppLink, formatPhone } from "@/lib/utils";
import { PlainLead } from "@/types";

interface EditLeadModalProps {
  lead: PlainLead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (lead: PlainLead) => void;
  onDelete?: (leadId: string) => void;
}

export function EditLeadModal({
  lead,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
}: EditLeadModalProps) {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState<LeadSource>("INSTAGRAM");
  const [plan, setPlan] = useState<PlanType>("INDEFINIDO");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (lead) {
      setName(lead.name);
      setPhone(lead.phone);
      setSource(lead.source);
      setPlan(lead.plan);
      setNotes(lead.notes || "");
    }
  }, [lead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;

    setLoading(true);

    const result = await updateLead({
      id: lead.id,
      name,
      phone: phone.replace(/\D/g, ""),
      source,
      plan,
      notes: notes || null,
    });

    setLoading(false);

    if (result.success && result.data) {
      toast.success("Lead atualizado!", {
        description: "As alterações foram salvas.",
      });
      onUpdate(result.data);
    } else {
      toast.error(result.error || "Erro ao atualizar lead");
    }
  };

  const handleDelete = async () => {
    if (!lead) return;

    if (!confirm("Tem certeza que deseja excluir este lead? Esta ação não pode ser desfeita.")) return;

    setDeleting(true);

    const result = await deleteLead(lead.id);

    setDeleting(false);

    if (result.success) {
      toast.success("Lead excluído", {
        description: "O lead foi removido do pipeline.",
      });
      onOpenChange(false);
      onDelete?.(lead.id);
    } else {
      toast.error(result.error || "Erro ao excluir lead");
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-brand-card border-white/[0.08] shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Edit3 className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <DialogTitle className="font-display text-xl">Editar Lead</DialogTitle>
              <DialogDescription className="text-text-secondary">
                Atualize as informações do lead
              </DialogDescription>
            </div>
            {/* Quick WhatsApp */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => window.open(getWhatsAppLink(phone), "_blank")}
              className="text-brand-accent hover:bg-brand-accent/10"
            >
              <MessageCircle className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="relative space-y-5 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-sm font-medium text-text-secondary">
                Nome
              </Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
                className="h-11 bg-white/[0.03] border-white/10 focus:border-brand-accent/50 input-glow transition-all"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-phone" className="text-sm font-medium text-text-secondary">
                Telefone
              </Label>
              <div className="flex gap-2">
                <Input
                  id="edit-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  required
                  disabled={loading}
                  className="h-11 flex-1 bg-white/[0.03] border-white/10 focus:border-brand-accent/50 input-glow font-mono transition-all"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(getWhatsAppLink(phone), "_blank")}
                  title="Abrir WhatsApp"
                  className="h-11 w-11 border-white/10 hover:border-brand-accent/50 hover:bg-brand-accent/10"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-text-tertiary font-mono">
                {formatPhone(phone)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-source" className="text-sm font-medium text-text-secondary">
                Origem
              </Label>
              <Select value={source} onValueChange={(v) => setSource(v as LeadSource)}>
                <SelectTrigger className="h-11 bg-white/[0.03] border-white/10 focus:border-brand-accent/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-strong border-white/10">
                  <SelectItem value="INSTAGRAM" className="focus:bg-brand-accent/20">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500" />
                      Instagram
                    </span>
                  </SelectItem>
                  <SelectItem value="GOOGLE" className="focus:bg-brand-accent/20">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      Google
                    </span>
                  </SelectItem>
                  <SelectItem value="INDICACAO" className="focus:bg-brand-accent/20">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Indicação
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
              <Label htmlFor="edit-plan" className="text-sm font-medium text-text-secondary">
                Interesse/Plano
              </Label>
              <Select value={plan} onValueChange={(v) => setPlan(v as PlanType)}>
                <SelectTrigger className="h-11 bg-white/[0.03] border-white/10 focus:border-brand-accent/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-strong border-white/10">
                  <SelectItem value="INDEFINIDO" className="focus:bg-brand-accent/20">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-gray-500" />
                      Indefinido
                    </span>
                  </SelectItem>
                  <SelectItem value="PLANO_UNICO" className="focus:bg-brand-accent/20">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Plano Único
                    </span>
                  </SelectItem>
                  <SelectItem value="PLANO_MENSAL" className="focus:bg-brand-accent/20">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-brand-accent" />
                      Plano Mensal
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-notes" className="text-sm font-medium text-text-secondary">
              Notas
            </Label>
            <Textarea
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Specs do PC, observações, etc..."
              rows={4}
              disabled={loading}
              className="bg-white/[0.03] border-white/10 focus:border-brand-accent/50 input-glow resize-none transition-all"
            />
          </div>

          <div className="flex justify-between pt-4 border-t border-white/[0.06]">
            <Button
              type="button"
              variant="ghost"
              onClick={handleDelete}
              disabled={loading || deleting}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-2"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Excluir
            </Button>

            <div className="flex gap-3">
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
                disabled={loading}
                className="bg-brand-accent hover:bg-brand-accent/90 text-text-dark font-semibold shadow-glow hover:shadow-glow-lg transition-all duration-300 gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Salvar
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
