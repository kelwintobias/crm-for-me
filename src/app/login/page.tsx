"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
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
      window.location.href = "/";
    } catch {
      toast.error("Erro ao fazer login. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg relative overflow-hidden flex items-center justify-center p-4">
      {/* Background simplificado para performance */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-accent/5 via-transparent to-blue-500/5" />
      </div>

      {/* Content Container */}
      <div className="relative z-10 w-full max-w-md animate-fade-in-up">
        
        {/* Branding Section */}
        <div className="flex flex-col items-center justify-center mb-8">
            {/* Logo */}
            <div className="relative w-24 h-24 mb-4">
                <Image 
                    src="/assets/images/branding/upboost-logo-full.png" 
                    alt="UPBOOST Logo" 
                    fill
                    className="object-contain drop-shadow-2xl"
                    priority
                />
            </div>
            
            {/* Nome da Empresa */}
            <h1 className="font-display text-4xl text-text-primary tracking-tight mb-2">
                <span className="font-bold">UP</span>
                <span className="font-normal">BOOST</span>
            </h1>
            
            {/* Slogan */}
            <p className="text-sm text-text-tertiary font-light tracking-wide text-center">
                Otimização extrema para quem busca performance.
            </p>
        </div>

        {/* Form Card */}
        <div className="glass-strong rounded-2xl p-8 shadow-2xl neon-border">
          <div className="mb-8 text-center">
            <h2 className="font-display text-xl font-semibold text-text-primary mb-2">
              Acesso Restrito
            </h2>
            <p className="text-text-secondary text-sm">
              Insira suas credenciais para continuar
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative z-[9999] bg-background p-4 rounded-lg border border-white/10" style={{ isolation: 'isolate' }}>
              <div className="space-y-2 mb-6">
                <Label htmlFor="email" className="text-sm font-medium text-text-secondary">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={false}
                  className="h-12 bg-white border-white/10 focus:border-brand-accent/50 input-glow transition-all relative z-[9999] opacity-100 cursor-text text-black !pointer-events-auto"
                />
              </div>

              <div className="space-y-2 mb-6">
                <Label htmlFor="password" className="text-sm font-medium text-text-secondary">
                  Senha
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={false}
                  className="h-12 bg-white border-white/10 focus:border-brand-accent/50 input-glow transition-all relative z-[9999] opacity-100 cursor-text text-black !pointer-events-auto"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-base font-semibold bg-brand-accent hover:bg-brand-accent/90 text-text-dark shadow-glow hover:shadow-glow-lg transition-all duration-300 group relative z-[9999] !pointer-events-auto"
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
            </div>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-white/[0.06]">
            <p className="text-center text-sm text-text-tertiary">
              <span className="text-brand-accent hover:text-brand-accent/80 cursor-pointer transition-colors">
                Esqueceu a senha?
              </span>
            </p>
          </div>
        </div>

        {/* Trust badges */}
        <div className="mt-8 flex items-center justify-center gap-6 text-text-tertiary animate-fade-in delay-500">
          <div className="flex items-center gap-2 text-xs opacity-60 hover:opacity-100 transition-opacity">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Ambiente Seguro
          </div>
          <div className="flex items-center gap-2 text-xs opacity-60 hover:opacity-100 transition-opacity">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            Criptografia E2E
          </div>
        </div>
      </div>
    </div>
  );
}
