"use client";

import { Zap, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "./user-menu";
import type { User } from "@supabase/supabase-js";

interface HeaderProps {
  user: User;
  onNewLead: () => void;
}

export function Header({ user, onNewLead }: HeaderProps) {
  return (
    <header className="bg-brand-card border-b border-border">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-accent rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-text-dark" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary">UpBoost</h1>
              <p className="text-xs text-text-secondary">CRM</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <Button onClick={onNewLead} className="hidden sm:flex">
              <Plus className="w-4 h-4 mr-2" />
              Novo Lead
            </Button>
            <Button onClick={onNewLead} size="icon" className="sm:hidden">
              <Plus className="w-4 h-4" />
            </Button>
            <UserMenu user={user} />
          </div>
        </div>
      </div>
    </header>
  );
}
