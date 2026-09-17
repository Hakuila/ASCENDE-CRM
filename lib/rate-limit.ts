import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  limit: number;
};

/**
 * P1-02: rate limiting por janela fixa, persistido no Postgres via a RPC
 * check_rate_limit (migration 0007). Um contador em memória (Map/objeto no
 * processo) NÃO funciona em serverless — cada invocação pode cair numa
 * instância diferente, sem estado compartilhado.
 *
 * `key` deve identificar de forma única o que está sendo limitado —
 * sempre prefixe com o nome do endpoint/ação, para não misturar limites de
 * rotas diferentes por engano:
 *
 *   checkRateLimit(`login:${ip}`, 60, 10)
 *   checkRateLimit(`leads-capture-org:${organizationId}`, 60, 60)
 *
 * Em caso de falha da própria infraestrutura de rate limit (RPC fora do
 * ar, etc.), a função falha ABERTA (permite a requisição) — preferimos
 * arriscar não limitar por alguns instantes a derrubar o produto inteiro
 * por causa do limitador. A falha é logada para investigação.
 */
export async function checkRateLimit(
  key: string,
  windowSeconds: number,
  maxRequests: number
): Promise<RateLimitResult> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_key: key,
    p_window_seconds: windowSeconds,
    p_max_requests: maxRequests,
  });

  if (error || data == null) {
    console.error("[rate-limit] falha ao checar limite, permitindo requisição:", error);
    return { allowed: true, remaining: maxRequests, limit: maxRequests };
  }

  const result = data as { allowed: boolean; remaining: number };
  return { allowed: result.allowed, remaining: result.remaining, limit: maxRequests };
}

/**
 * Extrai o IP do cliente a partir dos headers padrão de proxy (Vercel,
 * Cloudflare, etc.). Nenhum desses headers é garantido em todo ambiente de
 * deploy — se nenhum estiver presente, cai em "unknown" (o que efetivamente
 * agrupa todas as requisições sem IP identificável num único balde de rate
 * limit; aceitável como fallback, não deve ser o caminho comum em produção).
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  return "unknown";
}