"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { updateLead, deleteLead } from "@/app/actions/leads";
import { listUsersForSelect } from "@/app/actions/users";
import { toast } from "sonner";
import {
  Loader2,
  Trash2,
  ExternalLink,
  Edit3,
  Save,
  MessageCircle,
  AlertTriangle,
  User,
  ShoppingBag,
  CalendarIcon,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { LeadSource, PlanType } from "@prisma/client";
import { getWhatsAppLink, formatPhone } from "@/lib/utils";
import { PlainLead } from "@/types";

// Precos por pacote (regra de negocio)
const PACKAGE_PRICES: Record<string, number> = {
  INTERMEDIARIO: 25.00,
  AVANCADO: 40.00,
  ELITE: 50.00,
  PRO_PLUS: 75.00,
  ULTRA_PRO: 100.00,
  EVOLUTION: 150.00,
};

// Validacao de telefone brasileiro (10-11 digitos)
function validatePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 0) return null;
  if (digits.length < 10) return "Telefone muito curto (min. 10 digitos)";
  if (digits.length > 11) return "Telefone muito longo (max. 11 digitos)";
  return null;
}

// Formatacao de CPF (XXX.XXX.XXX-XX)
function formatCpf(cpf: string): string {
  const digits = cpf.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("geral");

  // Campos da aba "Geral"
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [source, setSource] = useState<LeadSource>("INSTAGRAM");
  const [plan, setPlan] = useState<PlanType>("INDEFINIDO");
  const [notes, setNotes] = useState("");
  const [userId, setUserId] = useState("");
  const [usersList, setUsersList] = useState<{ id: string; name: string | null }[]>([]);

  // Campos da aba "Dados da Venda" (Espelho da Planilha)
  const [packageType, setPackageType] = useState("");
  const [saleValue, setSaleValue] = useState(0);
  const [addOns, setAddOns] = useState("");
  const [contractDate, setContractDate] = useState<Date | undefined>(undefined);
  const [cpf, setCpf] = useState("");
  const [instagram, setInstagram] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    if (lead) {
      // Aba Geral
      setName(lead.name);
      setPhone(lead.phone);
      setPhoneError(null);
      setEmail(lead.email || "");
      setSource(lead.source);
      setPlan(lead.plan);
      setNotes(lead.notes || "");
      setUserId(lead.owner?.id || "");

      // Aba Dados da Venda
      setPackageType(lead.packageType || "");
      setSaleValue(lead.value);
      setAddOns(lead.addOns || "");
      setContractDate(lead.contractDate ? new Date(lead.contractDate) : undefined);
      setCpf(lead.cpf || "");
      setInstagram(lead.instagram || "");
      setTermsAccepted(lead.termsAccepted || false);

      // Reset para aba inicial
      setActiveTab("geral");
    }
  }, [lead]);

  useEffect(() => {
    if (open && usersList.length === 0) {
      listUsersForSelect().then((result) => {
        if (result.success && result.data) {
          setUsersList(result.data);
        }
      });
    }
  }, [open, usersList.length]);

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, "");
    setPhone(digits);
    setPhoneError(validatePhone(digits));
  };

  const handlePackageChange = (value: string) => {
    setPackageType(value);
    if (PACKAGE_PRICES[value]) {
      setSaleValue(PACKAGE_PRICES[value]);
    }
  };

  const handleCpfChange = (value: string) => {
    const formatted = formatCpf(value);
    setCpf(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;

    setLoading(true);

    const result = await updateLead({
      id: lead.id,
      // Aba Geral
      name,
      phone: phone.replace(/\D/g, ""),
      email: email || null,
      source,
      plan,
      notes: notes || null,
      userId: userId || undefined,
      // Aba Dados da Venda
      packageType: packageType || null,
      addOns: addOns || null,
      contractDate: contractDate ? contractDate.toISOString().split("T")[0] : null,
      cpf: cpf.replace(/\D/g, "") || null,
      instagram: instagram || null,
      termsAccepted,
    });

    setLoading(false);

    if (result.success && result.data) {
      toast.success("Lead atualizado!", {
        description: "As alteracoes foram salvas.",
      });
      onUpdate(result.data);
    } else {
      toast.error(result.error || "Erro ao atualizar lead");
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!lead) return;

    setDeleting(true);
    setShowDeleteDialog(false);

    const result = await deleteLead(lead.id);

    setDeleting(false);

    if (result.success) {
      toast.success("Lead excluido", {
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
      <DialogContent className="sm:max-w-xl bg-brand-card border-white/[0.08] shadow-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Edit3 className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <DialogTitle className="font-display text-xl">
                Ficha do Lead
              </DialogTitle>
              <DialogDescription className="text-text-secondary">
                Visualize e edite todas as informacoes
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

        <form onSubmit={handleSubmit} className="relative space-y-4 mt-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 bg-white/[0.03]">
              <TabsTrigger
                value="geral"
                className="flex items-center gap-2 data-[state=active]:bg-brand-accent/20"
              >
                <User className="h-4 w-4" />
                Geral
              </TabsTrigger>
              <TabsTrigger
                value="venda"
                className="flex items-center gap-2 data-[state=active]:bg-brand-accent/20"
              >
                <ShoppingBag className="h-4 w-4" />
                Dados da Venda
              </TabsTrigger>
            </TabsList>

            {/* ==================== ABA GERAL ==================== */}
            <TabsContent value="geral" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="edit-name"
                    className="text-sm font-medium text-text-secondary"
                  >
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
                  <Label
                    htmlFor="edit-phone"
                    className="text-sm font-medium text-text-secondary"
                  >
                    Telefone
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="edit-phone"
                      value={phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      required
                      disabled={loading}
                      className={`h-11 flex-1 bg-white/[0.03] focus:border-brand-accent/50 input-glow font-mono transition-all ${phoneError
                        ? "border-red-500/50 focus:border-red-500"
                        : phone.length >= 10
                          ? "border-emerald-500/50"
                          : "border-white/10"
                        }`}
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
                  {phoneError ? (
                    <p className="text-xs text-red-400">{phoneError}</p>
                  ) : (
                    <p className="text-xs text-text-tertiary font-mono">
                      {formatPhone(phone)}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="edit-email"
                  className="text-sm font-medium text-text-secondary"
                >
                  Email
                </Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  disabled={loading}
                  className="h-11 bg-white/[0.03] border-white/10 focus:border-brand-accent/50 input-glow transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="edit-source"
                    className="text-sm font-medium text-text-secondary"
                  >
                    Origem
                  </Label>
                  <Select
                    value={source}
                    onValueChange={(v) => setSource(v as LeadSource)}
                  >
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
                  <Label
                    htmlFor="edit-plan"
                    className="text-sm font-medium text-text-secondary"
                  >
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
                      <SelectItem value="INTERMEDIARIO" className="focus:bg-brand-accent/20">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          Intermediário - R$ 25
                        </span>
                      </SelectItem>
                      <SelectItem value="AVANCADO" className="focus:bg-brand-accent/20">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          Avançado - R$ 40
                        </span>
                      </SelectItem>
                      <SelectItem value="ELITE" className="focus:bg-brand-accent/20">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-purple-500" />
                          Elite - R$ 50
                        </span>
                      </SelectItem>
                      <SelectItem value="PRO_PLUS" className="focus:bg-brand-accent/20">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          Pro Plus - R$ 75
                        </span>
                      </SelectItem>
                      <SelectItem value="ULTRA_PRO" className="focus:bg-brand-accent/20">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          Ultra Pro - R$ 100
                        </span>
                      </SelectItem>
                      <SelectItem value="EVOLUTION" className="focus:bg-brand-accent/20">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-brand-accent" />
                          Evolution - R$ 150
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="edit-userId"
                  className="text-sm font-medium text-text-secondary"
                >
                  Atendido por
                </Label>
                <Select
                  value={userId}
                  onValueChange={setUserId}
                  disabled={loading}
                >
                  <SelectTrigger className="h-11 bg-white/[0.03] border-white/10 focus:border-brand-accent/50">
                    <SelectValue placeholder="Selecione o atendente..." />
                  </SelectTrigger>
                  <SelectContent className="glass-strong border-white/10">
                    {usersList.map((u) => (
                      <SelectItem key={u.id} value={u.id} className="focus:bg-brand-accent/20">
                        <span className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-text-tertiary" />
                          {u.name || u.id}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="edit-notes"
                  className="text-sm font-medium text-text-secondary"
                >
                  Observacoes
                </Label>
                <Textarea
                  id="edit-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Specs do PC, observacoes, etc..."
                  rows={3}
                  disabled={loading}
                  className="bg-white/[0.03] border-white/10 focus:border-brand-accent/50 input-glow resize-none transition-all"
                />
              </div>
            </TabsContent>

            {/* ==================== ABA DADOS DA VENDA ==================== */}
            <TabsContent value="venda" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="edit-packageType"
                    className="text-sm font-medium text-text-secondary"
                  >
                    Pacote Adquirido
                  </Label>
                  <Select
                    value={packageType}
                    onValueChange={handlePackageChange}
                    disabled={loading}
                  >
                    <SelectTrigger className="h-11 bg-white/[0.03] border-white/10 focus:border-brand-accent/50">
                      <SelectValue placeholder="Selecione o pacote..." />
                    </SelectTrigger>
                    <SelectContent className="glass-strong border-white/10">
                      <SelectItem value="INTERMEDIARIO" className="focus:bg-brand-accent/20">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          Intermediário - R$ 25
                        </span>
                      </SelectItem>
                      <SelectItem value="AVANCADO" className="focus:bg-brand-accent/20">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          Avançado - R$ 40
                        </span>
                      </SelectItem>
                      <SelectItem value="ELITE" className="focus:bg-brand-accent/20">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-purple-500" />
                          Elite - R$ 50
                        </span>
                      </SelectItem>
                      <SelectItem value="PRO_PLUS" className="focus:bg-brand-accent/20">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          Pro Plus - R$ 75
                        </span>
                      </SelectItem>
                      <SelectItem value="ULTRA_PRO" className="focus:bg-brand-accent/20">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          Ultra Pro - R$ 100
                        </span>
                      </SelectItem>
                      <SelectItem value="EVOLUTION" className="focus:bg-brand-accent/20">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-brand-accent" />
                          Evolution - R$ 150
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="edit-addOns"
                    className="text-sm font-medium text-text-secondary"
                  >
                    Adicionais
                  </Label>
                  <Input
                    id="edit-addOns"
                    value={addOns}
                    onChange={(e) => setAddOns(e.target.value)}
                    placeholder="Servicos extras..."
                    disabled={loading}
                    className="h-11 bg-white/[0.03] border-white/10 focus:border-brand-accent/50 input-glow transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="edit-value"
                    className="text-sm font-medium text-text-secondary"
                  >
                    Valor Pago
                  </Label>
                  <Input
                    id="edit-value"
                    value={`R$ ${saleValue.toFixed(2).replace(".", ",")}`}
                    disabled
                    className="h-11 bg-white/[0.02] border-white/5 text-text-tertiary font-mono cursor-not-allowed"
                  />
                  <p className="text-xs text-text-tertiary">
                    Atualizado automaticamente pelo pacote
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-text-secondary">
                    Data da Compra
                  </Label>
                  <Popover modal={true}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        disabled={loading}
                        className="w-full h-11 justify-start text-left font-normal bg-white/[0.03] border-white/10 hover:bg-white/[0.05] hover:border-brand-accent/50"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-text-tertiary" />
                        {contractDate ? (
                          format(contractDate, "dd/MM/yyyy", { locale: ptBR })
                        ) : (
                          <span className="text-text-tertiary">Selecionar data</span>
                        )}
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="edit-cpf"
                    className="text-sm font-medium text-text-secondary"
                  >
                    CPF
                  </Label>
                  <Input
                    id="edit-cpf"
                    value={cpf}
                    onChange={(e) => handleCpfChange(e.target.value)}
                    placeholder="000.000.000-00"
                    disabled={loading}
                    className="h-11 bg-white/[0.03] border-white/10 focus:border-brand-accent/50 input-glow font-mono transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="edit-instagram"
                    className="text-sm font-medium text-text-secondary"
                  >
                    Instagram
                  </Label>
                  <Input
                    id="edit-instagram"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="@usuario ou link"
                    disabled={loading}
                    className="h-11 bg-white/[0.03] border-white/10 focus:border-brand-accent/50 input-glow transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <Checkbox
                  id="edit-termsAccepted"
                  checked={termsAccepted}
                  onCheckedChange={(checked) =>
                    setTermsAccepted(checked === true)
                  }
                  disabled={loading}
                />
                <Label
                  htmlFor="edit-termsAccepted"
                  className="text-sm font-medium text-text-secondary cursor-pointer"
                >
                  Declaracao / Termos aceitos
                </Label>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between pt-4 border-t border-white/[0.06]">
            <Button
              type="button"
              variant="ghost"
              onClick={handleDeleteClick}
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
                disabled={loading || !!phoneError}
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

      {/* Dialog de confirmacao de exclusao */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <AlertDialogTitle>Excluir Lead</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir <strong>{lead?.name}</strong>?
                  Esta acao nao pode ser desfeita.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir Lead
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog >
  );
}
