import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Analytics', to: '/analytics' },
  { label: 'History', to: '/history' },
  { label: 'Exports', to: '/exports' },
  { label: 'Schedule', to: '/schedule' },
  { label: 'Budget', to: '/budget' },
  { label: 'Settings', to: '/settings' },
  { label: 'Notifications', to: '/notifications' },
  { label: 'Power Safety', to: '/power-safety' },
  { label: 'Reference Comparison', to: '/reference-comparison' },
];

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-[color:var(--color-background)] text-[color:var(--color-text)]">
      <div className="grid min-h-screen grid-cols-[260px_1fr]">
        <aside className="border-r border-[color:var(--color-border)] bg-white">
          <div className="px-6 py-5">
            <div className="text-xl font-semibold text-[color:var(--color-primary)]">
              WattWise
            </div>
            <div className="text-xs text-[color:var(--color-text-light)]">
              Energy dashboard
            </div>
          </div>
          <nav className="px-3 pb-6">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-[color:var(--color-primary-light)]/20 text-[color:var(--color-primary-dark)]'
                      : 'text-[color:var(--color-text)] hover:bg-[color:var(--color-background)]',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <div className="flex min-h-screen flex-col">
          <header className="flex h-16 items-center justify-between border-b border-[color:var(--color-border)] bg-white px-6">
            <div className="text-sm font-semibold">Control Center</div>
            <div className="text-xs text-[color:var(--color-text-light)]">
              Real-time monitoring
            </div>
          </header>
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
