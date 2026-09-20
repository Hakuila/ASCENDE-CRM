"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * P2-05: componente de erro compartilhado pelos error.tsx de cada domínio
 * sob app/(dashboard)/**. Cada error.tsx é um wrapper fino em volta deste
 * componente — o Next.js exige que o próprio arquivo error.tsx seja um
 * Client Component, então "use client" precisa estar em cada um deles
 * também, não só aqui.
 */
export function ErrorState({
  error,
  reset,
  title = "Algo deu errado ao carregar esta página",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white p-12 text-center">
      <p className="text-sm font-medium text-gray-900">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-gray-400">
        Tente novamente. Se o problema continuar, avise o suporte.
      </p>
      <Button variant="secondary" className="mt-4" onClick={() => reset()}>
        Tentar novamente
      </Button>
    </div>
  );
}
