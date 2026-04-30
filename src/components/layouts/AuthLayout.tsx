import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <main className="min-h-screen bg-[color:var(--color-background)] px-6 py-12">
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6">
        <div className="text-center">
          <div className="text-2xl font-semibold text-[color:var(--color-primary)]">WattWise</div>
          <div className="text-sm text-[color:var(--color-text-light)]">
            Sign in to your energy dashboard
          </div>
        </div>
        <div className="w-full rounded-[var(--spacing-radius)] border border-[color:var(--color-border)] bg-white p-6 shadow-sm">
          <Outlet />
        </div>
      </div>
    </main>
  );
}
