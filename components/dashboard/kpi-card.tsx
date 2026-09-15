export function KpiCard({
  label,
  value,
  insufficientMessage,
}: {
  label: string;
  value: string | number | null;
  insufficientMessage?: string;
}) {
  const isInsufficient = value === null;

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      {isInsufficient ? (
        <p className="mt-1 text-sm text-gray-400">
          {insufficientMessage ?? "Dados insuficientes."}
        </p>
      ) : (
        <p className="mt-1 text-xl font-semibold text-gray-900">{value}</p>
      )}
    </div>
  );
}
