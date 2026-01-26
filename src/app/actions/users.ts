"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ===========================================
// VALIDATION SCHEMAS
// ===========================================

const createUserSchema = z.object({
  email: z.string().email("Email inválido"),
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  role: z.enum(["ADMIN", "VENDEDOR"]).default("VENDEDOR"),
  allowedTabs: z.array(z.string()).default(["kanban", "pessoas"]),
});

const updateUserTabsSchema = z.object({
  userId: z.string().uuid(),
  allowedTabs: z.array(z.string()),
});

const updatePasswordSchema = z.object({
  newPassword: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

// ===========================================
// HELPER: Verificar se é Admin
// ===========================================

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user: supabaseUser } } = await supabase.auth.getUser();

  if (!supabaseUser) {
    throw new Error("Não autenticado");
  }

  const user = await prisma.user.findUnique({
    where: { email: supabaseUser.email! },
  });

  if (!user || user.role !== "ADMIN") {
    throw new Error("Acesso negado: apenas administradores");
  }

  return { supabaseUser, user };
}

// ===========================================
// LISTAR TODOS OS USUÁRIOS
// ===========================================

export async function listUsers() {
  try {
    await requireAdmin();

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

    return { success: true, data: users };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Erro ao listar usuários" 
    };
  }
}

// ===========================================
// CRIAR NOVO USUÁRIO
// ===========================================

export async function createUser(formData: FormData) {
  try {
    await requireAdmin();

    const rawData = {
      email: formData.get("email") as string,
      name: formData.get("name") as string,
      password: formData.get("password") as string,
      role: formData.get("role") as "ADMIN" | "VENDEDOR",
      allowedTabs: JSON.parse(formData.get("allowedTabs") as string || '["kanban", "pessoas"]'),
    };

    const validated = createUserSchema.parse(rawData);

    // Criar usuário no Supabase Auth (requer service_role key)
    const supabaseAdmin = createAdminClient();
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: validated.email,
      password: validated.password,
      email_confirm: true,
    });

    if (authError) {
      throw new Error(`Erro ao criar usuário no Supabase: ${authError.message}`);
    }

    // Criar usuário no Prisma
    const user = await prisma.user.create({
      data: {
        id: authData.user.id,
        email: validated.email,
        name: validated.name,
        role: validated.role,
        allowedTabs: validated.allowedTabs,
        mustChangePassword: true, // Força troca de senha no primeiro login
      },
    });

    revalidatePath("/admin/users");

    return { success: true, data: user };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Erro ao criar usuário" 
    };
  }
}

// ===========================================
// ATUALIZAR ABAS PERMITIDAS
// ===========================================

export async function updateUserTabs(userId: string, allowedTabs: string[]) {
  try {
    await requireAdmin();

    const validated = updateUserTabsSchema.parse({ userId, allowedTabs });

    const user = await prisma.user.update({
      where: { id: validated.userId },
      data: { allowedTabs: validated.allowedTabs },
    });

    revalidatePath("/admin/users");

    return { success: true, data: user };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Erro ao atualizar permissões" 
    };
  }
}

// ===========================================
// FORÇAR REDEFINIÇÃO DE SENHA
// ===========================================

export async function forcePasswordReset(userId: string) {
  try {
    await requireAdmin();

    const user = await prisma.user.update({
      where: { id: userId },
      data: { mustChangePassword: true },
    });

    revalidatePath("/admin/users");

    return { success: true, message: "Usuário deverá alterar a senha no próximo login" };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Erro ao forçar redefinição de senha" 
    };
  }
}

// ===========================================
// ATUALIZAR PRÓPRIA SENHA (primeiro login)
// ===========================================

export async function updateOwnPassword(formData: FormData) {
  try {
    const supabase = await createClient();
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();

    if (!supabaseUser) {
      throw new Error("Não autenticado");
    }

    const rawData = {
      newPassword: formData.get("newPassword") as string,
      confirmPassword: formData.get("confirmPassword") as string,
    };

    const validated = updatePasswordSchema.parse(rawData);

    // Atualizar senha no Supabase
    const { error: updateError } = await supabase.auth.updateUser({
      password: validated.newPassword,
    });

    if (updateError) {
      throw new Error(`Erro ao atualizar senha: ${updateError.message}`);
    }

    // Marcar que não precisa mais trocar senha
    await prisma.user.update({
      where: { email: supabaseUser.email! },
      data: { mustChangePassword: false },
    });

    return { success: true, message: "Senha atualizada com sucesso" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Erro ao atualizar senha" 
    };
  }
}

// ===========================================
// BUSCAR USUÁRIO ATUAL COM PERMISSÕES
// ===========================================

export async function getCurrentUserWithPermissions() {
  try {
    const supabase = await createClient();
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();

    if (!supabaseUser) {
      return { success: false, error: "Não autenticado" };
    }

    const user = await prisma.user.findUnique({
      where: { email: supabaseUser.email! },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        allowedTabs: true,
        mustChangePassword: true,
        commissionRate: true,
      },
    });

    if (!user) {
      // Criar usuário se não existir (fallback)
      const newUser = await prisma.user.create({
        data: {
          id: supabaseUser.id,
          email: supabaseUser.email!,
          name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split("@")[0],
          role: "VENDEDOR",
          allowedTabs: ["kanban", "pessoas"],
          mustChangePassword: false,
        },
      });
      return { success: true, data: newUser };
    }

    return { success: true, data: user };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Erro ao buscar usuário" 
    };
  }
}

// ===========================================
// DELETAR USUÁRIO
// ===========================================

export async function deleteUser(userId: string) {
  try {
    const { user: adminUser } = await requireAdmin();

    // Não permitir deletar a si mesmo
    if (adminUser.id === userId) {
      throw new Error("Você não pode deletar sua própria conta");
    }

    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userToDelete) {
      throw new Error("Usuário não encontrado");
    }

    // Deletar do Supabase Auth (requer service_role key)
    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      throw new Error(`Erro ao deletar usuário do Supabase: ${error.message}`);
    }

    // Deletar do Prisma
    await prisma.user.delete({
      where: { id: userId },
    });

    revalidatePath("/admin/users");

    return { success: true, message: "Usuário deletado com sucesso" };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Erro ao deletar usuário" 
    };
  }
}
