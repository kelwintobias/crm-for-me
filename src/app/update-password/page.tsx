import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { UpdatePasswordForm } from "./update-password-form";

export const dynamic = "force-dynamic";

export default async function UpdatePasswordPage() {
    // Verificar autenticação
    const supabase = await createClient();
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();

    if (!supabaseUser) {
        redirect("/login");
    }

    // Verificar se realmente precisa trocar a senha
    const user = await prisma.user.findUnique({
        where: { email: supabaseUser.email! },
    });

    if (!user?.mustChangePassword) {
        redirect("/");
    }

    return <UpdatePasswordForm userEmail={supabaseUser.email!} />;
}
