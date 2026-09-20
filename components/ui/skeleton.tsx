import { cn } from "@/lib/utils";

/**
 * P2-04: primitivo base de skeleton — usado pelos loading.tsx de cada
 * domínio (ver components/ui/skeleton.tsx e os arquivos loading.tsx sob
 * app/(dashboard)/**). Formas compostas abaixo (tabela, cards, formulário,
 * detalhe, kanban) cobrem os layouts que já existem no produto, para o
 * estado de carregamento parecer com a página real em vez de um spinner
 * genérico.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-gray-100", className)} />;
}

export function TableSkeleton({ rows = 6, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
      <div className="border-b border-gray-100 bg-gray-50 p-3">
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-gray-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4 p-3">
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton key={c} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-gray-100 bg-white p-4">
          <Skeleton className="mb-3 h-4 w-24" />
          <Skeleton className="h-7 w-16" />
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <CardsSkeleton count={4} />
      <div className="rounded-xl border border-gray-100 bg-white p-4">
        <Skeleton className="mb-4 h-4 w-32" />
        <Skeleton className="h-56 w-full" />
      </div>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-64" />
      <div className="space-y-3 rounded-xl border border-gray-100 bg-white p-6">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="space-y-3 rounded-xl border border-gray-100 bg-white p-6">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

export function FormSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <div className="max-w-2xl space-y-4 rounded-xl border border-gray-100 bg-white p-6">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="h-10 w-32" />
    </div>
  );
}

export function KanbanSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Array.from({ length: columns }).map((_, i) => (
        <div
          key={i}
          className="flex w-72 flex-shrink-0 flex-col rounded-xl border border-gray-100 bg-gray-50 p-3"
        >
          <Skeleton className="mb-3 h-5 w-20" />
          <Skeleton className="mb-2 h-16 w-full" />
          <Skeleton className="mb-2 h-16 w-full" />
        </div>
      ))}
    </div>
  );
}
