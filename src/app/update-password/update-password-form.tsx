"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, KeyRound, CheckCircle2, AlertTriangle } from "lucide-react";
import Image from "next/image";
import { updateOwnPassword } from "@/app/actions/users";

interface UpdatePasswordFormProps {
    userEmail: string;
}

export function UpdatePasswordForm({ userEmail }: UpdatePasswordFormProps) {
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const passwordsMatch = newPassword === confirmPassword;
    const isValid = newPassword.length >= 6 && passwordsMatch;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isValid) {
            toast.error("Verifique os campos e tente novamente");
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.set("newPassword", newPassword);
            formData.set("confirmPassword", confirmPassword);

            const result = await updateOwnPassword(formData);

            if (result.success) {
                setSuccess(true);
                toast.success("Senha atualizada com sucesso!");
                setTimeout(() => {
                    window.location.href = "/";
                }, 2000);
            } else {
                toast.error(result.error || "Erro ao atualizar senha");
            }
        } catch {
            toast.error("Erro ao atualizar senha");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
                <div className="glass-strong rounded-2xl p-8 max-w-md w-full text-center animate-fade-in-up">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                    </div>
                    <h2 className="text-xl font-display font-semibold text-text-primary mb-2">
                        Senha Atualizada!
                    </h2>
                    <p className="text-text-secondary">
                        Redirecionando para o CRM...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-bg relative overflow-hidden flex items-center justify-center p-4">
            {/* Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5" />
            </div>

            {/* Content */}
            <div className="relative z-10 w-full max-w-md animate-fade-in-up">
                {/* Branding */}
                <div className="flex flex-col items-center justify-center mb-8">
                    <div className="relative w-20 h-20 mb-4">
                        <Image
                            src="/assets/images/branding/upboost-logo-full.png"
                            alt="UPBOOST Logo"
                            fill
                            className="object-contain drop-shadow-2xl"
                            priority
                        />
                    </div>
                    <h1 className="font-display text-3xl text-text-primary tracking-tight">
                        <span className="font-bold">UP</span>
                        <span className="font-normal">BOOST</span>
                    </h1>
                </div>

                {/* Form Card */}
                <div className="glass-strong rounded-2xl p-8 shadow-2xl border border-amber-500/20">
                    {/* Warning Banner */}
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-6">
                        <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0" />
                        <div>
                            <p className="text-amber-400 font-medium text-sm">ATUALIZE SUA SENHA</p>
                            <p className="text-text-tertiary text-xs mt-1">
                                Por segurança, você deve criar uma nova senha antes de continuar.
                            </p>
                        </div>
                    </div>

                    <div className="mb-6 text-center">
                        <div className="w-14 h-14 rounded-full bg-brand-accent/20 flex items-center justify-center mx-auto mb-4">
                            <KeyRound className="h-6 w-6 text-brand-accent" />
                        </div>
                        <h2 className="font-display text-xl font-semibold text-text-primary">
                            Criar Nova Senha
                        </h2>
                        <p className="text-text-secondary text-sm mt-1">
                            {userEmail}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="newPassword" className="text-text-secondary">
                                Nova Senha
                            </Label>
                            <Input
                                id="newPassword"
                                type="password"
                                placeholder="Mínimo 6 caracteres"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                minLength={6}
                                className="h-12 bg-white/5 border-white/10 text-text-primary"
                            />
                            {newPassword.length > 0 && newPassword.length < 6 && (
                                <p className="text-xs text-red-400">
                                    A senha deve ter pelo menos 6 caracteres
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword" className="text-text-secondary">
                                Confirmar Senha
                            </Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="Digite novamente"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className={`h-12 bg-white/5 border-white/10 text-text-primary ${confirmPassword.length > 0 && !passwordsMatch
                                        ? "border-red-500/50"
                                        : confirmPassword.length > 0 && passwordsMatch
                                            ? "border-emerald-500/50"
                                            : ""
                                    }`}
                            />
                            {confirmPassword.length > 0 && !passwordsMatch && (
                                <p className="text-xs text-red-400">
                                    As senhas não coincidem
                                </p>
                            )}
                            {confirmPassword.length > 0 && passwordsMatch && (
                                <p className="text-xs text-emerald-400">
                                    ✓ As senhas coincidem
                                </p>
                            )}
                        </div>

                        <Button
                            type="submit"
                            disabled={loading || !isValid}
                            className="w-full h-12 text-base font-semibold bg-brand-accent hover:bg-brand-accent/90 text-text-dark shadow-glow transition-all"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Atualizando...
                                </>
                            ) : (
                                "Atualizar Senha"
                            )}
                        </Button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-text-tertiary text-xs mt-6">
                    Sua sessão está protegida por criptografia de ponta a ponta.
                </p>
            </div>
        </div>
    );
}
