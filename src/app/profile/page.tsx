import { getCurrentUser } from "@/app/actions/leads";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { User, Shield, Mail, Calendar, Settings, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
    const user = await getCurrentUser();

    const isAdmin = user.role === "ADMIN";
    const initials = user.email ? user.email.slice(0, 2).toUpperCase() : "UP";

    return (
        <div className="container mx-auto py-10 px-4">
            <div className="max-w-2xl mx-auto space-y-6">
                {/* Botão Voltar */}
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors min-h-[44px] -ml-1 px-2 py-2 rounded-lg hover:bg-white/[0.05]"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Voltar ao Dashboard</span>
                </Link>

                <div className="flex items-center gap-4 mb-8">
                    <Avatar className="h-20 w-20 border-2 border-border">
                        <AvatarFallback className="text-2xl bg-muted text-muted-foreground">{initials}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h1 className="text-3xl font-bold">{user.name || "Usuário"}</h1>
                        <p className="text-muted-foreground flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            {user.email}
                        </p>
                    </div>
                </div>

                <div className="grid gap-6">
                    {/* Cartão de Informações Básicas */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Informações da Conta
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Nome</p>
                                    <p className="font-medium">{user.name || "-"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Email</p>
                                    <p className="font-medium">{user.email}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Função</p>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={isAdmin ? "default" : "secondary"}>
                                            {isAdmin ? "Administrador" : "Vendedor"}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Membro desde</p>
                                    <p className="font-medium flex items-center gap-1">
                                        <Calendar className="h-3 w-3 text-muted-foreground" />
                                        {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Cartão de Ações Administrativas (Apenas Admins) */}
                    {isAdmin && (
                        <Card className="border-brand-accent/20 bg-brand-accent/5">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-brand-accent-foreground">
                                    <Shield className="h-5 w-5" />
                                    Painel de Administração
                                </CardTitle>
                                <CardDescription>
                                    Você possui privilégios de administrador para gerenciar o sistema.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Link href="/admin/users">
                                    <Button className="w-full sm:w-auto gap-2">
                                        <Settings className="h-4 w-4" />
                                        Gerenciar Usuários e Permissões
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
