"use client";

import { useTransition } from "react";
import { removeStaffAction } from "@/lib/agency/actions";

type Staff = { userId: string; name: string; email: string; createdAt: string };

export function StaffList({ staff, currentUserId }: { staff: Staff[]; currentUserId: string }) {
  const [isPending, startTransition] = useTransition();

  if (staff.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
        Nenhum membro de staff cadastrado.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
      {staff.map((s) => {
        const isSelf = s.userId === currentUserId;
        return (
          <div
            key={s.userId}
            className="flex items-center justify-between border-b border-gray-50 px-4 py-3 last:border-0"
          >
            <div>
              <p className="text-sm font-medium text-gray-900">
                {s.name} {isSelf && <span className="text-xs text-gray-400">(você)</span>}
              </p>
              <p className="text-xs text-gray-500">{s.email}</p>
            </div>
            <button
              type="button"
              disabled={isSelf || isPending}
              onClick={() => {
                if (confirm(`Remover ${s.name} do staff da agência?`)) {
                  startTransition(() => removeStaffAction(s.userId));
                }
              }}
              className="text-sm font-medium text-red-600 hover:underline disabled:opacity-30"
            >
              Remover
            </button>
          </div>
        );
      })}
    </div>
  );
}
