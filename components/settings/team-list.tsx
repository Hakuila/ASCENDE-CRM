"use client";

import { useTransition } from "react";
import { Select } from "@/components/ui/select";
import { updateMemberRoleAction, removeMemberAction } from "@/lib/settings/actions";
import type { TeamMember } from "@/lib/settings/queries";

const roleLabels = { client_admin: "Administrador", salesperson: "Vendedor" } as const;

function TeamMemberRow({
  member,
  currentUserId,
  isLastAdmin,
}: {
  member: TeamMember;
  currentUserId: string;
  isLastAdmin: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const isSelf = member.userId === currentUserId;

  return (
    <div className="flex items-center justify-between border-b border-gray-50 px-4 py-3 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-900">
          {member.name} {isSelf && <span className="text-xs text-gray-400">(você)</span>}
        </p>
        <p className="text-xs text-gray-500">{member.email}</p>
      </div>

      <div className="flex items-center gap-3">
        <Select
          defaultValue={member.role}
          disabled={isPending || isSelf || (member.role === "client_admin" && isLastAdmin)}
          className="w-40"
          onChange={(e) => {
            const newRole = e.target.value as "client_admin" | "salesperson";
            if (member.role === "client_admin" && newRole === "salesperson" && isLastAdmin) {
              alert("Essa é a única pessoa administradora — promova outra antes de rebaixar.");
              return;
            }
            startTransition(() => updateMemberRoleAction(member.membershipId, newRole));
          }}
        >
          <option value="client_admin">Administrador</option>
          <option value="salesperson">Vendedor</option>
        </Select>

        <button
          type="button"
          disabled={isPending || isSelf || (member.role === "client_admin" && isLastAdmin)}
          onClick={() => {
            if (member.role === "client_admin" && isLastAdmin) {
              alert("Essa é a única pessoa administradora — promova outra antes de remover.");
              return;
            }
            if (confirm(`Remover ${member.name} da equipe?`)) {
              startTransition(() => removeMemberAction(member.membershipId));
            }
          }}
          className="text-sm font-medium text-red-600 hover:underline disabled:opacity-30"
        >
          Remover
        </button>
      </div>
    </div>
  );
}

export function TeamList({ members, currentUserId }: { members: TeamMember[]; currentUserId: string }) {
  const adminCount = members.filter((m) => m.role === "client_admin").length;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
      {members.map((member) => (
        <TeamMemberRow
          key={member.membershipId}
          member={member}
          currentUserId={currentUserId}
          isLastAdmin={adminCount <= 1}
        />
      ))}
    </div>
  );
}
