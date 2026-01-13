"use client";

import { useState } from "react";
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
import { Loader2 } from "lucide-react";
import type { LeadSource } from "@prisma/client";

interface NewLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function NewLeadModal({ open, onOpenChange, onSuccess }: NewLeadModalProps) {
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<LeadSource>("INSTAGRAM");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("source", source);

    const result = await createLead(formData);

    setLoading(false);

    if (result.success) {
      toast.success("Lead criado com sucesso!");
      onOpenChange(false);
      onSuccess();
      // Reset form
      (e.target as HTMLFormElement).reset();
      setSource("INSTAGRAM");
    } else {
      toast.error(result.error || "Erro ao criar lead");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Lead</DialogTitle>
          <DialogDescription>
            Adicione um novo lead ao seu pipeline de vendas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              name="name"
              placeholder="Nome do cliente"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone *</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="11999999999"
              required
              disabled={loading}
              pattern="[0-9]*"
              inputMode="numeric"
            />
            <p className="text-xs text-text-secondary">
              Apenas números (DDD + número)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="source">Origem *</Label>
            <Select value={source} onValueChange={(v) => setSource(v as LeadSource)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INSTAGRAM">Instagram</SelectItem>
                <SelectItem value="GOOGLE">Google</SelectItem>
                <SelectItem value="INDICACAO">Indicação</SelectItem>
                <SelectItem value="OUTRO">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
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
                "Salvar Lead"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
