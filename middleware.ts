import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware de autenticação.
 * - Renova a sessão Supabase a cada request (necessário com @supabase/ssr).
 * - Redireciona usuários não autenticados que tentam acessar rotas protegidas.
 *
 * A resolução de organização/role acontece DEPOIS do login, dentro dos
 * layouts (dashboard)/layout.tsx e (agency)/layout.tsx, via lib/auth/get-session.ts.
 *
 * Importante: @supabase/ssr >= 0.4 usa a API getAll/setAll (não get/set/remove).
 */
export async function middleware(request: NextRequest) {
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

  const pathname = request.nextUrl.pathname;

  // Match EXATO (não startsWith) — evita capturar subpáginas por engano.
  const authEntryRoutes = ["/login", "/forgot-password"];
  const isAuthRoute = authEntryRoutes.includes(pathname);

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
