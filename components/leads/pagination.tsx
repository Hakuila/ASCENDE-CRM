import Link from "next/link";

export function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
      <span>
        Página {page} de {totalPages}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link
            href={buildHref(page - 1)}
            className="rounded-md border border-gray-200 px-3 py-1.5 hover:bg-gray-50"
          >
            Anterior
          </Link>
        )}
        {page < totalPages && (
          <Link
            href={buildHref(page + 1)}
            className="rounded-md border border-gray-200 px-3 py-1.5 hover:bg-gray-50"
          >
            Próxima
          </Link>
        )}
      </div>
    </div>
  );
}
