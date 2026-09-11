export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-lg font-semibold text-brand">CRM SaaS</span>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
