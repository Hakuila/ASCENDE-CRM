import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware de autenticação.
 * - Renova a sessão Supabase a cada request (necessário com @supabase/ssr).
 * - Redireciona usuários não autenticados que tentam acessar rotas protegidas.
 *
 * P1-02: o rate limiting de login/recuperação de senha NÃO fica mais aqui.
 * Login e recuperação são Server Actions (useFormState) — interceptar o
 * POST no middleware e devolver um NextResponse.json() quebra o protocolo
 * de resposta que o useFormState espera de volta, fazendo o erro
 * simplesmente não aparecer na tela a partir da tentativa limitada (sem
 * throw, sem mensagem, silêncio total). O rate limit agora vive dentro de
 * signInAction/forgotPasswordAction (lib/auth/actions.ts), que já retorna
 * `{ error }` no formato certo.
 *
 * A resolução de organização/role acontece DEPOIS do login, dentro dos
 * layouts (dashboard)/layout.tsx e (agency)/layout.tsx, via lib/auth/get-session.ts.
 *
 * Importante: @supabase/ssr >= 0.4 usa a API getAll/setAll (não get/set/remove).
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  // Match EXATO (não startsWith) — evita capturar subpáginas por engano.
  const isAuthRoute = ["/login", "/forgot-password"].includes(pathname);

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

  // Força troca de senha para contas criadas com senha temporária (convite
  // de equipe/cliente/staff). Checa em TODA request autenticada, não só
  // nas protegidas — cobre o instante entre o login e o primeiro redirect
  // pro dashboard. Roda antes do redirect de "já logado, sai do /login"
  // abaixo, senão o usuário voltaria pro dashboard sem trocar a senha.
  if (user && !isPasswordRecoveryRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("must_change_password")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.must_change_password) {
      const url = request.nextUrl.clone();
      url.pathname = "/update-password";
      return NextResponse.redirect(url);
    }
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