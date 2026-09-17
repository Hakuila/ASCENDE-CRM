import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * Middleware de autenticação.
 * - Renova a sessão Supabase a cada request (necessário com @supabase/ssr).
 * - Redireciona usuários não autenticados que tentam acessar rotas protegidas.
 * - P1-02: aplica rate limiting no submit de login e recuperação de senha,
 *   ANTES de qualquer trabalho de autenticação — protege contra força
 *   bruta de credenciais e spam de e-mails de recuperação. No App Router,
 *   o submit de um <form action={serverAction}> em /login chega aqui como
 *   um POST para o próprio pathname /login, então dá pra interceptar sem
 *   precisar tocar na Server Action em si.
 *
 * A resolução de organização/role acontece DEPOIS do login, dentro dos
 * layouts (dashboard)/layout.tsx e (agency)/layout.tsx, via lib/auth/get-session.ts.
 *
 * Importante: @supabase/ssr >= 0.4 usa a API getAll/setAll (não get/set/remove).
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Match EXATO (não startsWith) — evita capturar subpáginas por engano.
  const authEntryRoutes = ["/login", "/forgot-password"];
  const isAuthRoute = authEntryRoutes.includes(pathname);

  if (request.method === "POST" && isAuthRoute) {
    const ip = getClientIp(request);
    // 10 tentativas / minuto por IP e por rota — generoso o suficiente
    // para um usuário real errando a senha algumas vezes, apertado o
    // bastante para inviabilizar força bruta de credenciais.
    const limit = await checkRateLimit(`${pathname}:${ip}`, 60, 10);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Muitas tentativas. Aguarde um minuto e tente novamente." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Quem chegou aqui vindo do link de recuperação está autenticado só para
  // trocar a senha — não pode ser redirecionado como se já tivesse "logado".
  const isPasswordRecoveryRoute = pathname.startsWith("/update-password");

  const isProtectedRoute =
    pathname.startsWith("/dashboard") || pathname.startsWith("/agency-dashboard");

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute && !isPasswordRecoveryRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};