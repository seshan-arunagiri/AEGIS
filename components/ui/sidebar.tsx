"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldAlert, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/navigation";

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Auto-close the mobile drawer whenever the route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll while mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      {/* ── Mobile hamburger trigger ──────────────────────────────────────────
          Visible only below md. Sits in the top-left corner just under the
          fixed Navbar (top-14 = 3.5rem = 56px).                              */}
      <button
        id="sidebar-mobile-toggle"
        aria-label="Open navigation menu"
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen(true)}
        className={cn(
          "fixed top-[3.75rem] left-3 z-40 flex h-8 w-8 items-center justify-center",
          "rounded-md border border-border bg-background shadow-sm transition-colors",
          "hover:bg-secondary md:hidden",
          mobileOpen && "hidden", // hide once drawer is open
        )}
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* ── Backdrop — tap outside to close ─────────────────────────────────── */}
      {mobileOpen && (
        <div
          aria-hidden="true"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 top-14 z-30 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}

      {/* ── Sidebar panel ────────────────────────────────────────────────────
          Mobile  : fixed overlay, slides in from the left (translate).
          Desktop : sticky in the flex layout (md:sticky overrides fixed).    */}
      <div
        id="sidebar-panel"
        className={cn(
          // Shared layout
          "flex flex-col w-64 h-[calc(100vh-3.5rem)]",
          "border-r border-border bg-background",
          // Mobile: fixed overlay + slide transition
          "fixed top-14 left-0 z-40 transition-transform duration-300 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop: revert to sticky in-flow, always visible
          "md:sticky md:top-14 md:translate-x-0",
        )}
      >
        {/* Header row — includes close button on mobile */}
        <div className="flex items-center justify-between p-6">
          <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-90">
            <ShieldAlert className="w-6 h-6 text-primary" />
            <span className="font-semibold text-lg tracking-tight">Aegis</span>
          </Link>
          {/* Close button — mobile only */}
          <button
            aria-label="Close navigation menu"
            onClick={() => setMobileOpen(false)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav items */}
        <div className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-secondary text-secondary-foreground font-medium"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/50 text-xs text-muted-foreground">
          Aegis v0.1.0
        </div>
      </div>
    </>
  );
}
