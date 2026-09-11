/**
 * Cria o primeiro super admin (staff da agência) da plataforma.
 *
 * Não existe tela para isso de propósito — o primeiro admin não pode ser
 * criado por ninguém autenticado, porque ninguém está autenticado ainda.
 * Depois que o primeiro existir, ele passa a convidar clientes pelo
 * próprio painel da agência (e, se quiser, dar acesso de agência a mais
 * gente diretamente pelo SQL Editor do Supabase, inserindo em
 * platform_admins).
 *
 * Uso:
 *   npm run seed:admin -- --name "Seu Nome" --email voce@agencia.com --password "senha-forte"
 *
 * Requer no .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };

  const name = get("--name");
  const email = get("--email");
  const password = get("--password");

  if (!name || !email || !password) {
    console.error(
      'Uso: npm run seed:admin -- --name "Seu Nome" --email voce@agencia.com --password "senha-forte"'
    );
    process.exit(1);
  }

  return { name, email, password };
}

async function main() {
  const { name, email, password } = parseArgs();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error(
      "Faltam NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY no .env.local"
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // já entra confirmado, sem precisar de link
    user_metadata: { name },
  });

  if (error || !data.user) {
    console.error("Erro ao criar usuário:", error?.message);
    process.exit(1);
  }

  // O trigger handle_new_auth_user já cria o profile automaticamente.
  const { error: adminError } = await supabase
    .from("platform_admins")
    .insert({ user_id: data.user.id });

  if (adminError) {
    console.error("Usuário criado, mas falhou ao marcar como platform_admin:", adminError.message);
    console.error(`Rode manualmente: insert into platform_admins (user_id) values ('${data.user.id}');`);
    process.exit(1);
  }

  console.log(`Super admin criado com sucesso: ${email}`);
  console.log("Já pode fazer login em /login e acessar /agency-dashboard.");
}

main();
