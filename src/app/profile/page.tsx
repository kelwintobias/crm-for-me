import { getCurrentUser, getMyLeads } from "@/app/actions/leads";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
    User,
    Shield,
    Mail,
    Calendar,
    Settings,
    ArrowLeft,
    Users,
    TrendingUp,
    CheckCircle,
    Phone,
    Clock,
    MessageCircle,
} from "lucide-react";
import { STAGE_LABELS, SOURCE_LABELS } from "@/types";
import { formatPhone, getWhatsAppLink } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
    const [user, myLeadsResult] = await Promise.all([
        getCurrentUser(),
        getMyLeads(),
    ]);

    const isAdmin = user.role === "ADMIN";
    const initials = user.email ? user.email.slice(0, 2).toUpperCase() : "UP";

    const myLeads = myLeadsResult.success ? myLeadsResult.data?.leads || [] : [];
    const stats = myLeadsResult.success ? myLeadsResult.data?.stats : null;

    return (
        <div className="container mx-auto py-10 px-4">
            <div className="max-w-4xl mx-auto space-y-6">
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

                    {/* Estatísticas de Atendimento */}
                    {stats && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5" />
                                    Meu Desempenho
                                </CardTitle>
                                <CardDescription>
                                    Estatísticas dos leads atendidos por você
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                        <div className="flex items-center gap-2 text-blue-400 mb-1">
                                            <Users className="h-4 w-4" />
                                            <span className="text-xs font-medium">Hoje</span>
                                        </div>
                                        <p className="text-2xl font-bold text-blue-300">{stats.leadsHoje}</p>
                                        <p className="text-xs text-blue-400/70">leads atendidos</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                        <div className="flex items-center gap-2 text-purple-400 mb-1">
                                            <Users className="h-4 w-4" />
                                            <span className="text-xs font-medium">Semana</span>
                                        </div>
                                        <p className="text-2xl font-bold text-purple-300">{stats.leadsSemana}</p>
                                        <p className="text-xs text-purple-400/70">leads atendidos</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                        <div className="flex items-center gap-2 text-emerald-400 mb-1">
                                            <CheckCircle className="h-4 w-4" />
                                            <span className="text-xs font-medium">Vendas Hoje</span>
                                        </div>
                                        <p className="text-2xl font-bold text-emerald-300">{stats.vendasHoje}</p>
                                        <p className="text-xs text-emerald-400/70">finalizados</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                        <div className="flex items-center gap-2 text-amber-400 mb-1">
                                            <CheckCircle className="h-4 w-4" />
                                            <span className="text-xs font-medium">Vendas Mês</span>
                                        </div>
                                        <p className="text-2xl font-bold text-amber-300">{stats.vendasMes}</p>
                                        <p className="text-xs text-amber-400/70">finalizados</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Lista de Leads Recentes */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Meus Leads Recentes
                            </CardTitle>
                            <CardDescription>
                                Últimos leads atendidos por você (máx. 50)
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {myLeads.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">
                                    Você ainda não tem leads atribuídos.
                                </p>
                            ) : (
                                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                                    {myLeads.map((lead) => (
                                        <div
                                            key={lead.id}
                                            className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-colors"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-medium text-text-primary truncate">
                                                        {lead.name}
                                                    </h4>
                                                    <Badge
                                                        variant={
                                                            lead.stage === "FINALIZADO"
                                                                ? "default"
                                                                : lead.stage === "PERDIDO"
                                                                    ? "destructive"
                                                                    : "secondary"
                                                        }
                                                        className="text-[10px]"
                                                    >
                                                        {STAGE_LABELS[lead.stage]}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Phone className="h-3 w-3" />
                                                        {formatPhone(lead.phone)}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {new Date(lead.updatedAt).toLocaleDateString("pt-BR", {
                                                            day: "2-digit",
                                                            month: "2-digit",
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                        })}
                                                    </span>
                                                    <span>{SOURCE_LABELS[lead.source]}</span>
                                                </div>
                                            </div>
                                            <a
                                                href={getWhatsAppLink(lead.phone)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 rounded-md bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white transition-colors ml-2"
                                            >
                                                <MessageCircle className="h-4 w-4" />
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            )}
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
