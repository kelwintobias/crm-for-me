"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, User as UserIcon, FileText } from "lucide-react";
import { signOut } from "@/app/actions/auth";

import Link from "next/link";

interface UserMenuProps {
  user: {
    name: string | null;
    email: string;
    role: string;
  };
}

export function UserMenu({ user }: UserMenuProps) {
  const initials = user.email
    ? user.email.slice(0, 2).toUpperCase()
    : "UP";

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-3 p-2 rounded-lg hover:bg-brand-card transition-colors">
          <Avatar className="h-9 w-9">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="text-left hidden sm:block">
            <p className="text-sm font-medium text-text-primary">
              {user.name || user.email.split("@")[0]}
            </p>
            <p className="text-xs text-text-secondary truncate max-w-[150px]">
              {user.role === "ADMIN" ? "Administrador" : "Vendedor"}
            </p>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/profile" className="cursor-pointer">
            <UserIcon className="mr-2 h-4 w-4" />
            <span>Meu Perfil</span>
          </Link>
        </DropdownMenuItem>

        {user.role === "ADMIN" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Administração</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href="/admin/users" className="cursor-pointer">
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Usuários</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/admin/logs" className="cursor-pointer">
                <FileText className="mr-2 h-4 w-4" />
                <span>Logs do Sistema</span>
              </Link>
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-red-400 focus:text-red-400 cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
