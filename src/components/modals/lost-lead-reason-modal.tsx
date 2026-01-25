"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

interface LostLeadReasonModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (reason: string) => void;
}

const REASONS = [
    "Preço alto",
    "Sem contato/Não responde",
    "Fechou com concorrente",
    "Desistiu da compra",
    "Não era o momento",
    "Outro",
];

export function LostLeadReasonModal({ open, onOpenChange, onConfirm }: LostLeadReasonModalProps) {
    const [selectedReason, setSelectedReason] = useState<string>("");
    const [otherReason, setOtherReason] = useState("");

    const handleConfirm = () => {
        if (!selectedReason) return;

        const finalReason = selectedReason === "Outro" ? otherReason : selectedReason;
        onConfirm(finalReason);

        // Reset
        setSelectedReason("");
        setOtherReason("");
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Motivo da Perda</DialogTitle>
                    <DialogDescription>
                        Por que este lead foi perdido? Essa informação é importante para melhorar suas vendas.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <RadioGroup value={selectedReason} onValueChange={setSelectedReason} className="gap-3">
                        {REASONS.map((reason) => (
                            <div key={reason} className="flex items-center space-x-2">
                                <RadioGroupItem value={reason} id={reason} />
                                <Label htmlFor={reason} className="cursor-pointer">{reason}</Label>
                            </div>
                        ))}
                    </RadioGroup>

                    {selectedReason === "Outro" && (
                        <div className="mt-2">
                            <Label htmlFor="other-reason" className="mb-2 block">Descreva o motivo:</Label>
                            <Textarea
                                id="other-reason"
                                value={otherReason}
                                onChange={(e) => setOtherReason(e.target.value)}
                                placeholder="Ex: Cliente mudou de cidade..."
                            />
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!selectedReason || (selectedReason === "Outro" && !otherReason.trim())}
                        className="bg-red-600 hover:bg-red-700 text-white"
                    >
                        Confirmar Perda
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
