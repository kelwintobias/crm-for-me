import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { UsersManagement } from "./users-management";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
    // Verificar autenticação
    const supabase = await createClient();
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();

    if (!supabaseUser) {
        redirect("/login");
    }

    // Verificar se é admin
    const user = await prisma.user.findUnique({
        where: { email: supabaseUser.email! },
    });

    if (!user || user.role !== "ADMIN") {
        redirect("/");
    }

    // Buscar todos os usuários
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            allowedTabs: true,
            mustChangePassword: true,
            createdAt: true,
        },
        orderBy: { createdAt: "desc" },
    });

    return <UsersManagement initialUsers={users} />;
}
