"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Zap, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error("Credenciais inválidas. Verifique seu email e senha.");
        return;
      }

      toast.success("Login realizado com sucesso!");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Erro ao fazer login. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] bg-brand-accent/10 rounded-full blur-[120px] animate-float" />
        <div className="absolute bottom-1/4 -right-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] animate-float delay-300" />
        <div className="absolute top-3/4 left-1/3 w-[400px] h-[400px] bg-emerald-500/8 rounded-full blur-[80px] animate-float delay-500" />

        {/* Grid overlay */}
        <div className="absolute inset-0 grid-bg opacity-50" />

        {/* Decorative lines */}
        <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-brand-accent/20 to-transparent" />
        <div className="absolute top-0 right-1/3 w-px h-full bg-gradient-to-b from-transparent via-blue-500/10 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex">
        {/* Left side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12">
          <div className="max-w-lg animate-fade-in-up">
            {/* Logo mark */}
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-brand-accent shadow-glow-lg animate-glow-pulse">
                <Zap className="w-10 h-10 text-text-dark" />
              </div>
            </div>

            {/* Headline */}
            <h1 className="font-display text-6xl font-bold text-text-primary mb-6 leading-tight">
              Acelere suas{" "}
              <span className="gradient-text text-glow">vendas</span>
            </h1>

            <p className="text-xl text-text-secondary leading-relaxed mb-8">
              O CRM que transforma leads em resultados. Gerencie seu pipeline com precisão e velocidade.
            </p>

            {/* Stats preview */}
            <div className="flex gap-8">
              <div className="animate-fade-in-up delay-200">
                <div className="text-3xl font-bold text-brand-accent font-display">+47%</div>
                <div className="text-sm text-text-secondary">Conversão</div>
              </div>
              <div className="animate-fade-in-up delay-300">
                <div className="text-3xl font-bold text-emerald-400 font-display">3x</div>
                <div className="text-sm text-text-secondary">Mais rápido</div>
              </div>
              <div className="animate-fade-in-up delay-400">
                <div className="text-3xl font-bold text-blue-400 font-display">24/7</div>
                <div className="text-sm text-text-secondary">Disponível</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login form */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md animate-fade-in-up delay-100">
            {/* Mobile logo */}
            <div className="lg:hidden text-center mb-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-brand-accent shadow-glow mb-4">
                <Zap className="w-8 h-8 text-text-dark" />
              </div>
              <h1 className="font-display text-3xl font-bold text-text-primary">
                UpBoost <span className="gradient-text">CRM</span>
              </h1>
            </div>

            {/* Form card */}
            <div className="glass-strong rounded-2xl p-8 shadow-2xl neon-border">
              <div className="mb-8">
                <h2 className="font-display text-2xl font-bold text-text-primary mb-2">
                  Bem-vindo de volta
                </h2>
                <p className="text-text-secondary">
                  Entre com suas credenciais para continuar
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-text-secondary">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12 bg-white/[0.03] border-white/10 focus:border-brand-accent/50 input-glow transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-text-secondary">
                    Senha
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12 bg-white/[0.03] border-white/10 focus:border-brand-accent/50 input-glow transition-all"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 text-base font-semibold bg-brand-accent hover:bg-brand-accent/90 text-text-dark shadow-glow hover:shadow-glow-lg transition-all duration-300 group"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    <>
                      Entrar
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </form>

              {/* Footer */}
              <div className="mt-8 pt-6 border-t border-white/[0.06]">
                <p className="text-center text-sm text-text-tertiary">
                  Esqueceu sua senha?{" "}
                  <span className="text-brand-accent hover:text-brand-accent/80 cursor-pointer transition-colors">
                    Contate o administrador
                  </span>
                </p>
              </div>
            </div>

            {/* Trust badges */}
            <div className="mt-8 flex items-center justify-center gap-6 text-text-tertiary animate-fade-in delay-500">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Sistema seguro
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse delay-100" />
                Dados criptografados
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
