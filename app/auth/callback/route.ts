import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * Rota de retorno do link de recuperação de senha: troca o `code` do
 * Supabase por uma sessão válida e manda para /update-password.
 *
 * P1-02: rate limit por IP — o `code` já é de uso único e expira rápido
 * (o que já limita bastante o dano), mas isso barra tentativas de
 * enumeração/força bruta do parâmetro antes mesmo de chamar o Supabase.
 *
 * (A criação de organização não depende mais de link de e-mail — ver
 * lib/agency/actions.ts. Esta rota hoje só serve para recuperação de senha.)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/update-password";

  const ip = getClientIp(request);
  const limit = await checkRateLimit(`auth-callback:${ip}`, 60, 20);
  if (!limit.allowed) {
    return NextResponse.redirect(`${origin}/login?error=muitas_tentativas`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=link_invalido`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}