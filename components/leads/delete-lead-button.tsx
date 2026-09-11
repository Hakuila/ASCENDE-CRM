"use client";

import { useTransition } from "react";
import { deleteLeadAction } from "@/lib/leads/actions";

export function DeleteLeadButton({ leadId }: { leadId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (confirm("Excluir este lead? Essa ação não pode ser desfeita.")) {
          startTransition(() => {
            deleteLeadAction(leadId);
          });
        }
      }}
      className="text-sm font-medium text-red-600 hover:underline disabled:opacity-60"
    >
      Excluir
    </button>
  );
}
