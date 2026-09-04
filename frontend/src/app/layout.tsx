import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  RiDashboardLine,
  RiDatabase2Line,
  RiMenuLine,
  RiPlayFill,
  RiPulseLine,
} from '@remixicon/react';
import { DashboardSidebar, type DashboardNavItem } from '@/components/application/dashboard/dashboard-sidebar';
import { LaunchRunModal } from '@/components/application/launch-run-modal';
import { RunNotifications } from '@/components/application/run-notifications';
import { Breadcrumb, BreadcrumbItem } from '@/components/base/breadcrumb/breadcrumb';
import { Button } from '@/components/base/buttons/button';
import { IconButton } from '@/components/base/buttons/icon-button';
import { useRunHarness } from '@/hooks/useRunHarness';
import { cx } from '@/utils/cx';
import { useAppStore } from '@/store';

const NAV: DashboardNavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: RiDashboardLine, href: '/' },
  { key: 'datasets', label: 'Datasets', icon: RiDatabase2Line, href: '/datasets' },
  { key: 'runs', label: 'Runs', icon: RiPulseLine, href: '/runs' },
];

function selectedKey(pathname: string): string {
  if (pathname.startsWith('/settings')) return 'settings';
  if (pathname.startsWith('/runs')) return 'runs';
  if (pathname.startsWith('/datasets')) return 'datasets';
  return 'dashboard';
}

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <time className="text-body-medium tabular-nums text-text-tertiary" dateTime={now.toISOString()}>
      {now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
      {' · '}
      {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </time>
  );
}

export function AppLayout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [launchOpen, setLaunchOpen] = useState(false);
  const active = useAppStore((s) => s.active);
  const loadCatalog = useAppStore((s) => s.loadCatalog);
  const loadRuns = useAppStore((s) => s.loadRuns);
  const { run, cancel, running } = useRunHarness();
  const selected = selectedKey(location.pathname);

  const crumbs = useMemo(() => {
    if (location.pathname === '/') return [{ label: 'Dashboard', current: true }];
    if (location.pathname.startsWith('/datasets/new')) {
      return [
        { label: 'Datasets', href: '/datasets' },
        { label: 'New', current: true },
      ];
    }
    if (location.pathname.startsWith('/datasets/') && active) {
      const tail = location.pathname.endsWith('/config') ? 'Eval config' : 'Ground truth';
      return [
        { label: 'Datasets', href: '/datasets' },
        { label: active.name, href: `/datasets/${active.id}` },
        { label: tail, current: true },
      ];
    }
    if (location.pathname.startsWith('/datasets')) return [{ label: 'Datasets', current: true }];
    if (location.pathname.startsWith('/runs/')) {
      return [
        { label: 'Runs', href: '/runs' },
        { label: 'Run detail', current: true },
      ];
    }
    if (location.pathname.startsWith('/runs')) return [{ label: 'Runs', current: true }];
    if (location.pathname.startsWith('/settings')) return [{ label: 'Settings', current: true }];
    return [{ label: 'Dashboard', current: true }];
  }, [location.pathname, active]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    void loadCatalog();
    void loadRuns();
  }, [loadCatalog, loadRuns]);

  return (
    <div className="flex min-h-dvh bg-background-full text-text-primary">
      <aside className="hidden p-3 lg:block">
        <DashboardSidebar selected={selected} items={NAV} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/20"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 p-3">
            <DashboardSidebar mobile selected={selected} items={NAV} onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 px-4 py-3 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <IconButton
              aria-label="Open navigation"
              className="lg:hidden"
              icon={RiMenuLine}
              onClick={() => setMobileOpen(true)}
            />
            <div className="min-w-0">
              <Breadcrumb>
                {crumbs.map((c) => (
                  <BreadcrumbItem key={c.label} href={c.href} current={c.current}>
                    {c.label}
                  </BreadcrumbItem>
                ))}
              </Breadcrumb>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Clock />
            {running ? (
              <Button variant="secondary" onClick={cancel}>
                Cancel
              </Button>
            ) : (
              <Button
                leadingIcon={RiPlayFill}
                disabled={!active}
                onClick={() => setLaunchOpen(true)}
              >
                Run Extraction Arena
              </Button>
            )}
          </div>
        </header>
        <main className="min-w-0 flex-1 overflow-auto px-4 pb-8 lg:px-6">
          <div className="mx-auto w-full max-w-[1300px]">
            <Outlet />
          </div>
        </main>
      </div>
      <RunNotifications />
      <LaunchRunModal
        isOpen={launchOpen}
        onClose={() => setLaunchOpen(false)}
        onLaunch={(pipelineId) => {
          setLaunchOpen(false);
          void run(pipelineId);
        }}
      />
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-title-1-semibold text-text-primary">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-body-regular text-text-secondary">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Surface({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <section
      className={cx(
        'rounded-3xl border border-border-button-default bg-background-primary-default p-4 shadow-card',
        className,
      )}
    >
      {children}
    </section>
  );
}

export function TextLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink to={to} className="text-body-medium text-button-ghost-foreground hover:underline">
      {children}
    </NavLink>
  );
}
