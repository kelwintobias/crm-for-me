"use client";

import { Zap, Plus, Search, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "./user-menu";

interface HeaderProps {
  user: {
    name: string | null;
    email: string;
  };
  onNewLead?: () => void;
}

export function Header({ user, onNewLead }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 glass border-b border-white/[0.06]">
      <div className="container mx-auto px-4 lg:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="relative group">
                <div className="w-10 h-10 bg-brand-accent rounded-xl flex items-center justify-center shadow-glow group-hover:shadow-glow-lg transition-shadow">
                  <Zap className="w-5 h-5 text-text-dark" />
                </div>
                {/* Pulse effect */}
                <div className="absolute inset-0 rounded-xl bg-brand-accent/30 animate-ping opacity-0 group-hover:opacity-100" style={{ animationDuration: '2s' }} />
              </div>
              <div className="hidden sm:block">
                <h1 className="font-display text-xl font-bold text-text-primary tracking-tight">
                  UpBoost
                </h1>
                <p className="text-[10px] text-text-tertiary uppercase tracking-widest -mt-0.5">
                  Sales CRM
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="hidden lg:block h-8 w-px bg-white/[0.08]" />

            {/* Search bar placeholder */}
            <div className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-text-tertiary hover:border-white/[0.1] transition-colors cursor-pointer group">
              <Search className="w-4 h-4 group-hover:text-text-secondary transition-colors" />
              <span className="text-sm">Buscar leads...</span>
              <kbd className="ml-8 px-1.5 py-0.5 rounded text-[10px] bg-white/[0.05] border border-white/[0.1] font-mono">
                ⌘K
              </kbd>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Notifications */}
            <Button
              variant="ghost"
              size="icon"
              className="relative text-text-secondary hover:text-text-primary hover:bg-white/[0.05]"
            >
              <Bell className="w-5 h-5" />
              {/* Notification dot */}
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
            </Button>

            {/* Divider */}
            <div className="h-8 w-px bg-white/[0.08]" />

            {/* New Lead Button */}
            <Button
              onClick={onNewLead}
              className="hidden sm:flex gap-2 bg-brand-accent hover:bg-brand-accent/90 text-text-dark font-semibold shadow-glow hover:shadow-glow-lg transition-all duration-300 group"
            >
              <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
              Novo Lead
            </Button>

            {/* Mobile new lead */}
            <Button
              onClick={onNewLead}
              size="icon"
              className="sm:hidden bg-brand-accent hover:bg-brand-accent/90 text-text-dark shadow-glow"
            >
              <Plus className="w-5 h-5" />
            </Button>

            {/* User menu */}
            <UserMenu user={user} />
          </div>
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-accent/20 to-transparent" />
    </header>
  );
}
