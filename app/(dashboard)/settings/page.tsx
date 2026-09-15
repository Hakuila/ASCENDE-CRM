import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getOrganizationProfile, getTeamMembers } from "@/lib/settings/queries";
import { isOrgAdmin } from "@/lib/permissions";
import { OrganizationForm } from "@/components/settings/organization-form";
import { TeamList } from "@/components/settings/team-list";
import { InviteTeamMemberForm } from "@/components/settings/invite-team-member-form";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session?.organization) redirect("/login");

  const [profile, members] = await Promise.all([
    getOrganizationProfile(session.organization.id),
    getTeamMembers(session.organization.id),
  ]);

  const admin = isOrgAdmin(session);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-gray-900">Configurações</h1>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Dados da empresa</h2>
        {admin ? (
          profile && (
            <OrganizationForm
              defaults={{
                name: profile.name,
                legalName: profile.legal_name,
                cnpj: profile.cnpj,
                logoUrl: profile.logo_url,
              }}
            />
          )
        ) : (
          <p className="text-sm text-gray-500">
            Só administradores podem editar os dados da empresa.
          </p>
        )}
      </section>

      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Equipe</h2>
        </div>
        <TeamList members={members} currentUserId={session.userId} />

        {admin && (
          <div className="mt-4">
            <InviteTeamMemberForm />
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Sua conta</h2>
        <p className="text-sm text-gray-500">
          Quer trocar sua senha?{" "}
          <Link href="/update-password" className="font-medium text-brand hover:underline">
            Definir nova senha
          </Link>
        </p>
      </section>
    </div>
  );
}
