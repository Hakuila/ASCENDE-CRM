"use client";

import { useTransition } from "react";
import { deleteCompanyAction } from "@/lib/companies/actions";

export function DeleteCompanyButton({ companyId }: { companyId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (confirm("Excluir esta empresa? Os leads associados ficam sem empresa vinculada.")) {
          startTransition(() => deleteCompanyAction(companyId));
        }
      }}
      className="text-sm font-medium text-red-600 hover:underline disabled:opacity-60"
    >
      Excluir
    </button>
  );
}
