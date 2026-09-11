import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Rota de retorno do link de recuperação de senha: troca o `code` do
 * Supabase por uma sessão válida e manda para /update-password.
 *
 * (A criação de organização não depende mais de link de e-mail — ver
 * lib/agency/actions.ts. Esta rota hoje só serve para recuperação de senha.)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/update-password";

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
