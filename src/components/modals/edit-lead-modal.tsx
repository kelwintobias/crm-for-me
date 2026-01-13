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
import { Loader2, Trash2, ExternalLink } from "lucide-react";
import type { Lead, LeadSource, PlanType } from "@prisma/client";
import { getWhatsAppLink, formatPhone } from "@/lib/utils";

interface EditLeadModalProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (lead: Lead) => void;
}

export function EditLeadModal({
  lead,
  open,
  onOpenChange,
  onUpdate,
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
      toast.success("Lead atualizado com sucesso!");
      onUpdate(result.data);
    } else {
      toast.error(result.error || "Erro ao atualizar lead");
    }
  };

  const handleDelete = async () => {
    if (!lead) return;

    if (!confirm("Tem certeza que deseja excluir este lead?")) return;

    setDeleting(true);

    const result = await deleteLead(lead.id);

    setDeleting(false);

    if (result.success) {
      toast.success("Lead excluído com sucesso!");
      onOpenChange(false);
      window.location.reload();
    } else {
      toast.error(result.error || "Erro ao excluir lead");
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Lead</DialogTitle>
          <DialogDescription>
            Atualize as informações do lead e selecione o plano de interesse.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-phone">Telefone</Label>
              <div className="flex gap-2">
                <Input
                  id="edit-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  required
                  disabled={loading}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(getWhatsAppLink(phone), "_blank")}
                  title="Abrir WhatsApp"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-text-secondary">
                {formatPhone(phone)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-source">Origem</Label>
              <Select value={source} onValueChange={(v) => setSource(v as LeadSource)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INSTAGRAM">Instagram</SelectItem>
                  <SelectItem value="GOOGLE">Google</SelectItem>
                  <SelectItem value="INDICACAO">Indicação</SelectItem>
                  <SelectItem value="OUTRO">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-plan">Interesse/Plano</Label>
              <Select value={plan} onValueChange={(v) => setPlan(v as PlanType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INDEFINIDO">Indefinido</SelectItem>
                  <SelectItem value="PLANO_UNICO">Plano Único</SelectItem>
                  <SelectItem value="PLANO_MENSAL">Plano Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notas</Label>
            <Textarea
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Specs do PC, observações, etc..."
              rows={4}
              disabled={loading}
            />
          </div>

          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={loading || deleting}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              <span className="ml-2">Excluir</span>
            </Button>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar"
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
