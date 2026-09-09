import { Link } from "@tanstack/react-router";
import { History, Home, ScanLine, User } from "lucide-react";
import type { ReactNode } from "react";

const navItems = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/scan", label: "Scan", icon: ScanLine },
  { to: "/history", label: "History", icon: History },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function AppShell({
  children,
  title,
  subtitle,
  action,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto w-full max-w-3xl px-5 pt-7 sm:px-8">
        {(title || action) && (
          <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
            <div className="min-w-0">
              {title && (
                <h1 className="font-display truncate text-2xl font-semibold tracking-tight">
                  {title}
                </h1>
              )}
              {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            {action}
          </header>
        )}
        <div className="mt-6">{children}</div>
      </div>
      <BottomNav />
    </div>
  );
}

function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur">
      <ul className="mx-auto flex w-full max-w-3xl items-stretch justify-between px-4 py-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              className="flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium text-muted-foreground transition-colors data-[status=active]:text-primary"
              activeProps={{ className: "text-primary" }}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
