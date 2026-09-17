import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getLeadsList, getOrgMembers, getDefaultPipelineStages } from "@/lib/leads/queries";
import { LeadsTable } from "@/components/leads/leads-table";
import { LeadFilters } from "@/components/leads/lead-filters";
import { Pagination } from "@/components/leads/pagination";
import { Button } from "@/components/ui/button";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: { search?: string; stageId?: string; ownerId?: string; page?: string };
}) {
  const session = await getSession();
  if (!session?.organization) redirect("/login");

  const organizationId = session.organization.id;
  const filters = {
    search: searchParams.search,
    stageId: searchParams.stageId,
    ownerId: searchParams.ownerId,
    page: searchParams.page ? Number(searchParams.page) : 1,
  };

  const [{ leads, page, totalPages }, members, { stages }] = await Promise.all([
    getLeadsList(organizationId, filters),
    getOrgMembers(organizationId),
    getDefaultPipelineStages(organizationId),
  ]);

  const buildHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.stageId) params.set("stageId", filters.stageId);
    if (filters.ownerId) params.set("ownerId", filters.ownerId);
    params.set("page", String(targetPage));
    return `/leads?${params.toString()}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Leads</h1>
          <p className="mt-1 text-sm text-gray-500">
            {session.organization.name}
          </p>
        </div>
        <Link href="/leads/novo">
          <Button>+ Novo lead</Button>
        </Link>
      </div>

      <div className="mt-6">
        <LeadFilters members={members} stages={stages} defaults={filters} />
      </div>

      <div className="mt-4">
        <LeadsTable leads={leads} />
      </div>

      <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}
