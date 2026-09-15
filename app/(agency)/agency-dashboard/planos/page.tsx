export default function PlanosAgenciaPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Planos</h1>
      <p className="mt-1 text-sm text-gray-500">
        Gestão de planos e assinaturas ainda não existe neste MVP.
      </p>

      <div className="mt-6 rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
        Quando o produto for comercializado como SaaS pra outras agências, essa
        tela vai integrar com um gateway de pagamento (Stripe ou similar) para
        cobrança recorrente por cliente/organização. Por enquanto, todas as
        organizações têm acesso completo.
      </div>
    </div>
  );
}
