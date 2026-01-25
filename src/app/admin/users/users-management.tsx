"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
    Users,
    Plus,
    KeyRound,
    Trash2,
    Shield,
    User as UserIcon,
    ArrowLeft,
    Settings,
} from "lucide-react";
import Link from "next/link";
import { createUser, updateUserTabs, forcePasswordReset, deleteUser } from "@/app/actions/users";

// ===========================================
// TYPES
// ===========================================

interface User {
    id: string;
    email: string;
    name: string | null;
    role: "ADMIN" | "VENDEDOR";
    allowedTabs: string[];
    mustChangePassword: boolean;
    createdAt: Date;
}

interface UsersManagementProps {
    initialUsers: User[];
}

// ===========================================
// CONSTANTS
// ===========================================

const AVAILABLE_TABS = [
    { id: "dashboard", label: "Dashboard", description: "Painel de métricas" },
    { id: "kanban", label: "Kanban", description: "Pipeline de leads" },
    { id: "contratos", label: "Contratos", description: "Gestão de contratos" },
    { id: "pessoas", label: "Pessoas", description: "Base de clientes" },
    { id: "custos", label: "Custos", description: "Custos fixos" },
    { id: "devedores", label: "Devedores", description: "Gestão de devedores" },
    { id: "logs", label: "Logs", description: "Logs de webhooks" },
];

// ===========================================
// MAIN COMPONENT
// ===========================================

export function UsersManagement({ initialUsers }: UsersManagementProps) {
    const [users, setUsers] = useState<User[]>(initialUsers);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isTabsOpen, setIsTabsOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(false);

    // ===========================================
    // HANDLERS
    // ===========================================

    const handleCreateUser = async (formData: FormData) => {
        setLoading(true);
        try {
            const result = await createUser(formData);
            if (result.success) {
                toast.success("Usuário criado com sucesso!");
                setIsCreateOpen(false);
                // Refresh page to get updated list
                window.location.reload();
            } else {
                toast.error(result.error || "Erro ao criar usuário");
            }
        } catch {
            toast.error("Erro ao criar usuário");
        } finally {
            setLoading(false);
        }
    };

    const handleForcePasswordReset = async (userId: string) => {
        if (!confirm("O usuário deverá criar uma nova senha no próximo login. Continuar?")) {
            return;
        }

        setLoading(true);
        try {
            const result = await forcePasswordReset(userId);
            if (result.success) {
                toast.success("Redefinição de senha solicitada");
                setUsers(users.map(u =>
                    u.id === userId ? { ...u, mustChangePassword: true } : u
                ));
            } else {
                toast.error(result.error || "Erro ao solicitar redefinição");
            }
        } catch {
            toast.error("Erro ao solicitar redefinição");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateTabs = async (userId: string, allowedTabs: string[]) => {
        setLoading(true);
        try {
            const result = await updateUserTabs(userId, allowedTabs);
            if (result.success) {
                toast.success("Permissões atualizadas!");
                setUsers(users.map(u =>
                    u.id === userId ? { ...u, allowedTabs } : u
                ));
                setIsTabsOpen(false);
                setSelectedUser(null);
            } else {
                toast.error(result.error || "Erro ao atualizar permissões");
            }
        } catch {
            toast.error("Erro ao atualizar permissões");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm("Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.")) {
            return;
        }

        setLoading(true);
        try {
            const result = await deleteUser(userId);
            if (result.success) {
                toast.success("Usuário excluído com sucesso");
                setUsers(users.filter(u => u.id !== userId));
            } else {
                toast.error(result.error || "Erro ao excluir usuário");
            }
        } catch {
            toast.error("Erro ao excluir usuário");
        } finally {
            setLoading(false);
        }
    };

    // ===========================================
    // RENDER
    // ===========================================

    return (
        <div className="min-h-screen bg-brand-bg p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/">
                            <Button variant="ghost" size="icon" className="text-text-secondary hover:text-text-primary">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-display font-bold text-text-primary flex items-center gap-2">
                                <Users className="h-6 w-6 text-brand-accent" />
                                Gerenciamento de Usuários
                            </h1>
                            <p className="text-text-secondary text-sm">
                                Crie contas, gerencie permissões e redefina senhas
                            </p>
                        </div>
                    </div>

                    {/* Create User Button */}
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-brand-accent hover:bg-brand-accent/90 text-text-dark">
                                <Plus className="h-4 w-4 mr-2" />
                                Novo Usuário
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-surface-card border-white/10">
                            <DialogHeader>
                                <DialogTitle className="text-text-primary">Criar Novo Usuário</DialogTitle>
                                <DialogDescription className="text-text-secondary">
                                    O usuário deverá atualizar a senha no primeiro login.
                                </DialogDescription>
                            </DialogHeader>
                            <CreateUserForm onSubmit={handleCreateUser} loading={loading} />
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Users Table */}
                <div className="glass-strong rounded-xl overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="text-left p-4 text-text-secondary font-medium">Usuário</th>
                                <th className="text-left p-4 text-text-secondary font-medium">Função</th>
                                <th className="text-left p-4 text-text-secondary font-medium">Abas Permitidas</th>
                                <th className="text-left p-4 text-text-secondary font-medium">Status</th>
                                <th className="text-right p-4 text-text-secondary font-medium">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-brand-accent/20 flex items-center justify-center">
                                                {user.role === "ADMIN" ? (
                                                    <Shield className="h-5 w-5 text-brand-accent" />
                                                ) : (
                                                    <UserIcon className="h-5 w-5 text-text-secondary" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-text-primary font-medium">{user.name || "Sem nome"}</p>
                                                <p className="text-text-tertiary text-sm">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.role === "ADMIN"
                                                ? "bg-brand-accent/20 text-brand-accent"
                                                : "bg-blue-500/20 text-blue-400"
                                            }`}>
                                            {user.role === "ADMIN" ? "Administrador" : "Vendedor"}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-wrap gap-1">
                                            {user.role === "ADMIN" ? (
                                                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs">
                                                    Acesso Total
                                                </span>
                                            ) : (
                                                user.allowedTabs.map((tab) => (
                                                    <span key={tab} className="px-2 py-0.5 rounded bg-white/10 text-text-secondary text-xs capitalize">
                                                        {tab}
                                                    </span>
                                                ))
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        {user.mustChangePassword ? (
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">
                                                Aguardando nova senha
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
                                                Ativo
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-end gap-2">
                                            {user.role !== "ADMIN" && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-text-secondary hover:text-text-primary"
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setIsTabsOpen(true);
                                                    }}
                                                    disabled={loading}
                                                >
                                                    <Settings className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-text-secondary hover:text-amber-400"
                                                onClick={() => handleForcePasswordReset(user.id)}
                                                disabled={loading}
                                            >
                                                <KeyRound className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-text-secondary hover:text-red-400"
                                                onClick={() => handleDeleteUser(user.id)}
                                                disabled={loading}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {users.length === 0 && (
                        <div className="p-8 text-center text-text-secondary">
                            Nenhum usuário encontrado
                        </div>
                    )}
                </div>

                {/* Edit Tabs Dialog */}
                <Dialog open={isTabsOpen} onOpenChange={(open) => {
                    setIsTabsOpen(open);
                    if (!open) setSelectedUser(null);
                }}>
                    <DialogContent className="bg-surface-card border-white/10">
                        <DialogHeader>
                            <DialogTitle className="text-text-primary">Permissões de Abas</DialogTitle>
                            <DialogDescription className="text-text-secondary">
                                Selecione quais abas {selectedUser?.name || selectedUser?.email} pode visualizar.
                            </DialogDescription>
                        </DialogHeader>
                        {selectedUser && (
                            <TabsPermissionForm
                                user={selectedUser}
                                onSubmit={handleUpdateTabs}
                                loading={loading}
                            />
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}

// ===========================================
// CREATE USER FORM
// ===========================================

function CreateUserForm({
    onSubmit,
    loading
}: {
    onSubmit: (formData: FormData) => Promise<void>;
    loading: boolean;
}) {
    const [selectedTabs, setSelectedTabs] = useState<string[]>(["kanban", "pessoas"]);
    const [role, setRole] = useState<"ADMIN" | "VENDEDOR">("VENDEDOR");

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        formData.set("allowedTabs", JSON.stringify(selectedTabs));
        formData.set("role", role);
        await onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="name" className="text-text-secondary">Nome</Label>
                <Input
                    id="name"
                    name="name"
                    placeholder="Nome do usuário"
                    required
                    className="bg-white/5 border-white/10 text-text-primary"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="email" className="text-text-secondary">Email</Label>
                <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="email@exemplo.com"
                    required
                    className="bg-white/5 border-white/10 text-text-primary"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="password" className="text-text-secondary">Senha Inicial</Label>
                <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                    className="bg-white/5 border-white/10 text-text-primary"
                />
            </div>

            <div className="space-y-2">
                <Label className="text-text-secondary">Função</Label>
                <Select value={role} onValueChange={(v) => setRole(v as "ADMIN" | "VENDEDOR")}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-text-primary">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-surface-card border-white/10">
                        <SelectItem value="VENDEDOR">Vendedor</SelectItem>
                        <SelectItem value="ADMIN">Administrador</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {role === "VENDEDOR" && (
                <div className="space-y-2">
                    <Label className="text-text-secondary">Abas Permitidas</Label>
                    <div className="space-y-2">
                        {AVAILABLE_TABS.map((tab) => (
                            <div key={tab.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                                <Checkbox
                                    id={`create-${tab.id}`}
                                    checked={selectedTabs.includes(tab.id)}
                                    onCheckedChange={(checked) => {
                                        if (checked) {
                                            setSelectedTabs([...selectedTabs, tab.id]);
                                        } else {
                                            setSelectedTabs(selectedTabs.filter(t => t !== tab.id));
                                        }
                                    }}
                                />
                                <div>
                                    <Label htmlFor={`create-${tab.id}`} className="text-text-primary cursor-pointer">
                                        {tab.label}
                                    </Label>
                                    <p className="text-xs text-text-tertiary">{tab.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <Button
                type="submit"
                className="w-full bg-brand-accent hover:bg-brand-accent/90 text-text-dark"
                disabled={loading}
            >
                {loading ? "Criando..." : "Criar Usuário"}
            </Button>
        </form>
    );
}

// ===========================================
// TABS PERMISSION FORM
// ===========================================

function TabsPermissionForm({
    user,
    onSubmit,
    loading
}: {
    user: User;
    onSubmit: (userId: string, tabs: string[]) => Promise<void>;
    loading: boolean;
}) {
    const [selectedTabs, setSelectedTabs] = useState<string[]>(user.allowedTabs);

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                {AVAILABLE_TABS.map((tab) => (
                    <div key={tab.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                        <Checkbox
                            id={`edit-${tab.id}`}
                            checked={selectedTabs.includes(tab.id)}
                            onCheckedChange={(checked) => {
                                if (checked) {
                                    setSelectedTabs([...selectedTabs, tab.id]);
                                } else {
                                    setSelectedTabs(selectedTabs.filter(t => t !== tab.id));
                                }
                            }}
                        />
                        <div>
                            <Label htmlFor={`edit-${tab.id}`} className="text-text-primary cursor-pointer">
                                {tab.label}
                            </Label>
                            <p className="text-xs text-text-tertiary">{tab.description}</p>
                        </div>
                    </div>
                ))}
            </div>

            <Button
                onClick={() => onSubmit(user.id, selectedTabs)}
                className="w-full bg-brand-accent hover:bg-brand-accent/90 text-text-dark"
                disabled={loading}
            >
                {loading ? "Salvando..." : "Salvar Permissões"}
            </Button>
        </div>
    );
}
