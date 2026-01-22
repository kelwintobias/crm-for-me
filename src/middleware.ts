import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Rotas públicas (não requerem autenticação)
  const publicRoutes = ["/login", "/auth/callback", "/api/webhooks", "/api/cron"];
  const isPublicRoute = publicRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  // Se não está logado e não está em rota pública, redireciona para login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Se está logado e está na página de login, redireciona para home
  if (user && request.nextUrl.pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Verificar se usuário precisa trocar senha
  // Ignorar para rotas de API e a própria página de update-password
  const passwordExemptRoutes = ["/update-password", "/api/", "/auth/"];
  const isPasswordExempt = passwordExemptRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  if (user && !isPasswordExempt) {
    // Fazer chamada para verificar mustChangePassword
    // Usamos um endpoint interno para evitar importar Prisma no middleware (Edge)
    try {
      const checkUrl = new URL("/api/user/check-password-status", request.url);
      const checkResponse = await fetch(checkUrl.toString(), {
        headers: {
          cookie: request.headers.get("cookie") || "",
        },
      });

      if (checkResponse.ok) {
        const data = await checkResponse.json();
        if (data.mustChangePassword) {
          const url = request.nextUrl.clone();
          url.pathname = "/update-password";
          return NextResponse.redirect(url);
        }
      }
    } catch {
      // Se falhar a verificação, continua normalmente
      console.error("Erro ao verificar status de senha");
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
