"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { TOP_NAV_ITEMS } from "@/lib/navigation";

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Auto-close the mobile menu whenever the route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">

          {/* Logo — explicitly links back to the landing page */}
          <Link href="/" className="flex items-center gap-2.5 group" id="nav-logo">
            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border/50 bg-muted/50 transition-colors group-hover:border-border group-hover:bg-muted">
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M7 1L12.196 4V10L7 13L1.804 10V4L7 1Z"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                  className="text-foreground"
                />
                <circle cx="7" cy="7" r="1.5" fill="currentColor" className="text-foreground" />
              </svg>
            </div>
            <span className="text-sm font-semibold tracking-tight text-foreground transition-opacity group-hover:opacity-90">
              Aegis
            </span>
          </Link>

          {/* Desktop nav links — sourced from lib/navigation.ts */}
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
            {TOP_NAV_ITEMS.map((item) => {
              const isActive =
                pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  id={`nav-${item.label.toLowerCase()}`}
                  className={
                    isActive
                      ? "rounded-md px-3 py-1.5 text-sm font-medium text-foreground bg-accent transition-colors"
                      : "rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
                  }
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right-side actions */}
          <div className="flex items-center gap-2">
            {/* GitHub icon — desktop only */}
            <Link
              href="https://github.com/seshan-arunagiri/AEGIS"
              target="_blank"
              rel="noopener noreferrer"
              id="nav-github"
              aria-label="GitHub"
              className="hidden text-muted-foreground transition-colors hover:text-foreground sm:block"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            </Link>

            {/* Try Demo CTA — always visible */}
            <Link
              href="/demo"
              id="nav-cta"
              className="rounded-md bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Try Demo
            </Link>

            {/* Mobile hamburger — below md only */}
            <button
              id="nav-mobile-toggle"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              aria-controls="nav-mobile-menu"
              onClick={() => setMobileOpen((o) => !o)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* ── Mobile dropdown panel ──────────────────────────────────────────
            Full-width panel that slides down below the header bar.
            Only rendered below the md breakpoint.                            */}
        {mobileOpen && (
          <nav
            id="nav-mobile-menu"
            aria-label="Mobile navigation"
            className="border-t border-border/50 bg-background/95 px-4 py-3 md:hidden"
          >
            <ul className="flex flex-col gap-1">
              {TOP_NAV_ITEMS.map((item) => {
                const isActive =
                  pathname === item.href || pathname?.startsWith(item.href + "/");
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      aria-current={isActive ? "page" : undefined}
                      className={
                        isActive
                          ? "flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-foreground bg-accent transition-colors"
                          : "flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
                      }
                    >
                      <item.icon
                        className={
                          isActive ? "h-4 w-4 shrink-0 text-foreground/70" : "h-4 w-4 shrink-0 text-muted-foreground"
                        }
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </header>

      {/* ── Mobile backdrop — tap anywhere outside to close ─────────────────
          Sits behind the header (z-40 < z-50) so the header itself is
          still interactive, but clicks on content dismiss the menu.          */}
      {mobileOpen && (
        <div
          aria-hidden="true"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 top-14 z-40 md:hidden"
        />
      )}
    </>
  );
}
