import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user: supabaseUser } } = await supabase.auth.getUser();

        if (!supabaseUser) {
            return NextResponse.json({ mustChangePassword: false });
        }

        const user = await prisma.user.findUnique({
            where: { email: supabaseUser.email! },
            select: { mustChangePassword: true },
        });

        return NextResponse.json({
            mustChangePassword: user?.mustChangePassword ?? false
        });
    } catch (error) {
        console.error("Error checking password status:", error);
        return NextResponse.json({ mustChangePassword: false });
    }
}
