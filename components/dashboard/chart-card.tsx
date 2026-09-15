export function ChartCard({
  title,
  isEmpty,
  emptyMessage,
  children,
}: {
  title: string;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5">
      <h3 className="mb-4 text-sm font-semibold text-gray-700">{title}</h3>
      {isEmpty ? (
        <div className="flex h-56 items-center justify-center text-sm text-gray-400">
          {emptyMessage ?? "Sem dados no período selecionado."}
        </div>
      ) : (
        <div className="h-56">{children}</div>
      )}
    </div>
  );
}
